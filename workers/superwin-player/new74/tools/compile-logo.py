"""Compile the observed 7-slot logo's visual quad animation, without game code."""
import json, math, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
asset = root / 'assets/multihotdeluxe'
data = json.loads((asset / 'logo.json').read_text())
assert data['skeleton']['spine'].startswith('3.8')
animation = data['animations']['animation']
regions = {}
name = None
for line in (asset / 'logo.atlas').read_text().splitlines():
    if not line.strip():
        continue
    if not line.startswith(' ') and ':' not in line:
        name = line
        regions[name] = {}
    elif name and line.startswith(' '):
        key, value = line.strip().split(':', 1)
        regions[name][key] = value.strip()
regions = {name: values for name, values in regions.items() if 'xy' in values}
sprites_path = root / 'src/sprites.json'
sprites = json.loads(sprites_path.read_text())
for name, values in regions.items():
    x, y = map(int, values['xy'].split(',')); w, h = map(int, values['size'].split(','))
    ow, oh = map(int, values['orig'].split(',')); ox, oy = map(int, values['offset'].split(','))
    sprites['multihotdeluxe']['LogoPart/' + name] = {'frame': {'x': x, 'y': y, 'w': w, 'h': h}, 'spineRotated': values['rotate'] == 'true', 'rotated': values['rotate'] == 'true', 'sourceSize': {'w': ow, 'h': oh}, 'spriteSourceSize': {'x': ox, 'y': oh-h-oy, 'w': w, 'h': h}, 'image': '/new74/assets/multihotdeluxe/logo.png'}
def timeline(track, time):
    if not track or time < track[0].get('time', 0): return None
    value = track[0]
    for item in track:
        if item.get('time', 0) > time: break
        value = item
    return value
def product(a, b):
    return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]]
tracks = [track for slot in animation.get('slots', {}).values() for track in slot.values()] + [track for bone in animation.get('bones', {}).values() for track in bone.values()]
duration = max(key.get('time', 0) for track in tracks for key in track)
skin = data['skins'][0]['attachments']; frames = []; bounds = [math.inf, math.inf, -math.inf, -math.inf]
for index in range(math.ceil(duration*30)):
    time = index/30; matrices = {}; commands = []
    for bone in data['bones']:
        tracks = animation.get('bones', {}).get(bone['name'], {})
        translation = timeline(tracks.get('translate'), time) or {}; scale = timeline(tracks.get('scale'), time) or {}; rotation = timeline(tracks.get('rotate'), time) or {}
        angle = math.radians(bone.get('rotation', 0)+rotation.get('angle', 0)); sx = bone.get('scaleX', 1)*scale.get('x', 1); sy = bone.get('scaleY', 1)*scale.get('y', 1)
        local = [math.cos(angle)*sx, math.sin(angle)*sx, -math.sin(angle)*sy, math.cos(angle)*sy, bone.get('x', 0)+translation.get('x', 0), bone.get('y', 0)+translation.get('y', 0)]
        matrices[bone['name']] = product(matrices[bone['parent']], local) if 'parent' in bone else local
    for slot in data['slots']:
        tracks = animation.get('slots', {}).get(slot['name'], {}); selected = timeline(tracks.get('attachment'), time)
        attachment = selected.get('name') if selected else slot.get('attachment')
        if not attachment: continue
        item = skin[slot['name']][attachment]; colour = timeline(tracks.get('color'), time)
        alpha = int((colour.get('color') if colour else slot.get('color', 'ffffffff'))[6:8], 16)/255
        if not alpha: continue
        if item.get('type') == 'mesh':
            vertices = item['vertices']; assert len(vertices) == 8, 'weighted mesh requires its own renderer'
            x = min(vertices[::2]); y = min(vertices[1::2]); w = max(vertices[::2])-x; h = max(vertices[1::2])-y
        else:
            assert item.get('type', 'region') == 'region'
            w = item['width']; h = item['height']; x = item.get('x', 0)-w/2; y = item.get('y', 0)-h/2
        matrix = matrices[slot['bone']]
        for px, py in [(x,y), (x+w,y), (x,y+h), (x+w,y+h)]:
            wx = matrix[0]*px+matrix[2]*py+matrix[4]; wy = matrix[1]*px+matrix[3]*py+matrix[5]
            bounds = [min(bounds[0],wx),min(bounds[1],wy),max(bounds[2],wx),max(bounds[3],wy)]
        commands.append({'sprite': 'LogoPart/'+item.get('path', attachment), 'matrix': matrix, 'rect': [x,y,w,h], 'alpha': alpha, 'additive': slot.get('blend') == 'additive'})
    frames.append(commands)
sprites['multihotdeluxe']['Title'] = sprites['multihotdeluxe']['LogoPart/5X']
sprites_path.write_text(json.dumps(sprites,separators=(',',':'))+'\n')
(root/'src/deluxe-logo.json').write_text(json.dumps({'fps':30,'bounds':bounds,'frames':frames},separators=(',',':'))+'\n')
print('Compiled', len(frames), 'visual frames;', len(regions), 'atlas regions;', 'bounds', bounds)
