"""Retain Habesha's active stylesheet rules in their original cascade order."""
import argparse
import json
import re
from pathlib import Path

GAME = 'habesha_fortune_5_native'
FOREIGN = re.compile(
    r'''\[data-native-(?:foxy|mh5|gamble)-controls[^\]]*\]|'''
    r'''\[data-native-help-layout=["']?(?:foxy|mh5)\b|'''
    r'''\[data-official-gamble=["']?(?:foxy|mh5)\b|'''
    r'''\.official-auto-mh5\b|\.native-foxy[\w-]*|'''
    r'''\.multi-(?:control|face)[\w-]*|\[data-multi-art\]|\[data-multi-face'''
)
IDENTITY = re.compile(r'''\[data-(?:game|machine)\s*=\s*["']?([^\]"'\s]+)''')


def foreign_selector(selector):
    return any(value != GAME for value in IDENTITY.findall(selector)) or bool(FOREIGN.search(selector))


def selectors(text):
    result, start, depth, quote = [], 0, 0, None
    for index, char in enumerate(text):
        if quote:
            if char == quote and (not index or text[index - 1] != '\\'):
                quote = None
        elif char in '\"\'':
            quote = char
        elif char in '([':
            depth += 1
        elif char in ')]':
            depth -= 1
        elif char == ',' and depth == 0:
            result.append(text[start:index].strip())
            start = index + 1
    result.append(text[start:].strip())
    return result


def prune(text):
    output, index, length = [], 0, len(text)
    while index < length:
        while index < length and text[index].isspace():
            index += 1
        if index >= length:
            break
        start, quote, parentheses = index, None, 0
        while index < length:
            char = text[index]
            if quote:
                if char == quote and text[index - 1] != '\\':
                    quote = None
            elif char in '\"\'':
                quote = char
            elif char == '(':
                parentheses += 1
            elif char == ')':
                parentheses -= 1
            elif parentheses == 0 and char in '{;':
                break
            index += 1
        if index >= length:
            output.append(text[start:])
            break
        heading = text[start:index].strip()
        if text[index] == ';':
            output.append(heading + ';')
            index += 1
            continue
        index += 1
        body_start, depth, quote = index, 1, None
        while index < length and depth:
            char = text[index]
            if quote:
                if char == quote and text[index - 1] != '\\':
                    quote = None
            elif char in '\"\'':
                quote = char
            elif char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
            index += 1
        if depth:
            raise ValueError('Unbalanced stylesheet')
        body = text[body_start:index - 1]
        if heading.startswith(('@media', '@supports', '@container', '@layer')):
            inner = prune(body)
            if inner.strip():
                output.append(heading + '{' + inner + '}')
        elif heading.startswith('@'):
            output.append(heading + '{' + body + '}')
        else:
            retained = [selector for selector in selectors(heading) if not foreign_selector(selector)]
            if retained:
                output.append(','.join(retained) + '{' + body + '}')
    return '\n'.join(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    args.output.mkdir(parents=True, exist_ok=True)
    summary = []
    for name in ['style.css', 'official-auto-bet.css', 'official-help.css', 'official-gamble.css', 'official-startup.css']:
        source = root / 'changes/habesha-r7/assets' / name if name == 'official-help.css' else args.baseline / name
        original = source.read_text()
        text = prune(re.sub(r'/\*.*?\*/', '', original, flags=re.S))
        text = text.replace('official-auto-foxy', 'official-auto-habesha').replace('official-bet-foxy', 'official-bet-habesha')
        for name_to_remove in ['spin-foxy.svg', 'spin-multi.svg', 'hex-control.svg', 'stake-bar.svg']:
            text = text.replace("url('./" + name_to_remove + "')", 'none')
        output = args.output / name
        output.write_text('/* Dedicated Habesha presentation; inherited active rules retain source order. */\n' + text + '\n')
        own_count = text.count(GAME)
        if GAME in original and not own_count:
            raise ValueError('Own-game rules were lost: ' + name)
        summary.append({'file': name, 'before': source.stat().st_size, 'after': output.stat().st_size, 'ownSelectors': own_count})
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
