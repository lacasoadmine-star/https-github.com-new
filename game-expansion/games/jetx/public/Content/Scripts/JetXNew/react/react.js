const html = htm.bind((type, props, ...children) => {
    // Treat empty tag as Fragment
    const actualType = type || React.Fragment;

    // Map 'class' to 'className' for React compatibility
    if (props && props.class) {
        props.className = props.class;
        delete props.class;
    }

    return React.createElement(actualType, props, ...children);
});

const amountFormatters = {};
const currencyDisplayCache = {};

function getAmountFormatter(fractionDigit) {
    const digits = fractionDigit | 0;
    return amountFormatters[digits] || (amountFormatters[digits] = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
        useGrouping: true,
    }));
}

function getCurrencyDisplay(currency) {
    const code = currency.currencyCode;
    const symbol = currency.currencySymbol;
    const cached = currencyDisplayCache[code];
    if (cached && cached.symbol === symbol) return cached;

    const noSymbol = typeof hasCurrencySymbol === 'function' && !hasCurrencySymbol(code);
    const isSymbolRight = typeof getCurrencySymbolPosition === 'function'
        && getCurrencySymbolPosition(code) === 'right';

    return currencyDisplayCache[code] = {
        symbol,
        currencyClass: noSymbol ? 'currency no-currency-symbol' : 'currency',
        isSymbolRight,
    };
}

class App extends React.Component {
    state = {
        current: [],
        active: [],
        cashOut: [],
        activeHeight: 0,
        activePaddingTop: 0,
        cashOutHeight: 0,
        cashOutPaddingTop: 0,
    };

    constructor() {
        super();

        window.jetXReact = this;
    }

    _activeHeight = 0;
    _activePaddingTop = 0;
    _cashOutHeight = 0;
    _cashOutPaddingTop = 0;
    _listGen = 0;

    setColumnMetrics = (activeHeight, activePaddingTop, cashOutHeight, cashOutPaddingTop, gen) => {
        if (typeof gen === 'number' && gen < this._listGen) return;
        this._activeHeight = activeHeight;
        this._activePaddingTop = activePaddingTop;
        this._cashOutHeight = cashOutHeight;
        this._cashOutPaddingTop = cashOutPaddingTop;
        const active = document.getElementById('playersActive');
        if (active) {
            active.style.height = activeHeight + 'px';
            active.style.paddingTop = activePaddingTop + 'px';
        }
        const cash = document.getElementById('playersCashOut');
        if (cash) {
            cash.style.height = cashOutHeight + 'px';
            cash.style.paddingTop = cashOutPaddingTop + 'px';
        }
    };

    setCurrent = (list, gen) => {
        this.setState(() => {
            if (typeof gen === 'number' && gen < this._listGen) return null;
            if (typeof gen === 'number') this._listGen = gen;
            return { current: list };
        });
    };

    setActive = (list, height, paddingTop, gen) => {
        if (typeof gen === 'number' && gen < this._listGen) return;
        if (typeof gen === 'number') this._listGen = gen;
        this._activeHeight = height;
        this._activePaddingTop = paddingTop;
        this.setState(() => {
            if (typeof gen === 'number' && gen < this._listGen) return null;
            return { active: list, activeHeight: height, activePaddingTop: paddingTop };
        });
    };

    setCashOut = (list, height, paddingTop, gen) => {
        if (typeof gen === 'number' && gen < this._listGen) return;
        if (typeof gen === 'number') this._listGen = gen;
        this._cashOutHeight = height;
        this._cashOutPaddingTop = paddingTop;
        this.setState(() => {
            if (typeof gen === 'number' && gen < this._listGen) return null;
            return { cashOut: list, cashOutHeight: height, cashOutPaddingTop: paddingTop };
        });
    };

    formatAmount(amount, currency) {
        amount = parseFloat(amount);
        if (amount === 0) {
            return html`--`;
        }
        const amountText = getAmountFormatter(currency.fractionDigit).format(amount);
        const { symbol, currencyClass, isSymbolRight } = getCurrencyDisplay(currency);
        return isSymbolRight
            ? html`<span>${amountText}</span> <span className=${currencyClass}>${symbol}</span>`
            : html`<span className=${currencyClass}>${symbol}</span> <span>${amountText}</span>`;
    }

    formatCoeff(cashoutFormated) {
        if (cashoutFormated === '-') {
            return html`--`;
        }
        return html`
            ${formatCoefficient(cashoutFormated)}<span className="coef">x</span>
        `;
    }

    componentDidUpdate() {
        if (typeof scheduleFitTextAll !== 'function') return;
        if (typeof isTextFitSuspended === 'function' && isTextFitSuspended()) return;
        scheduleFitTextAll(document.getElementById('players'));
    }

    render() {
        const current = this.state.current;
        const playersCurrent = current.map((item) => {
            const { playerId, status, displayName, betAmount, cashoutFormated, winAmount, currency, clientAvatar } = item;
            return html`
                <div className="bets-row ${status}" key=${playerId}>
                    <div class="bets-cell bets-cell--user"><div class="bets-avatar avatar avatar-${clientAvatar}"></div>${displayName}</div>
                    <div class="bets-cell"><span class="bets-amount text-fit">${this.formatAmount(betAmount, currency)}</span></div>
                    <div class="bets-cell">${this.formatCoeff(cashoutFormated)}</div>
                    <div class="bets-cell bets-cell--win"><span class="bets-win text-fit">${this.formatAmount(winAmount, currency)}</span></div>
                </div>
            `;
        });

        const active = this.state.active;
        const activeHeight = this._activeHeight;
        const activePaddingTop = this._activePaddingTop;
        const playersActive = active.map((item) => {
            const { playerId, status, displayName, betAmount, cashoutFormated, winAmount, currency, clientAvatar } = item;
            return html`
                <div className="bets-row ${status}" key=${playerId}>
                    <div class="bets-cell bets-cell--user"><div class="bets-avatar avatar avatar-${clientAvatar}"></div>${displayName}</div>
                    <div class="bets-cell"><span class="bets-amount text-fit">${this.formatAmount(betAmount, currency)}</span></div>
                    <div class="bets-cell">${this.formatCoeff(cashoutFormated)}</div>
                    <div class="bets-cell bets-cell--win"><span class="bets-win text-fit">${this.formatAmount(winAmount, currency)}</span></div>
                </div>
            `;
        });

        const cashOut = this.state.cashOut;
        const cashOutHeight = this._cashOutHeight;
        const cashOutPaddingTop = this._cashOutPaddingTop;
        const playersCashOut = cashOut.map((item) => {
            const { playerId, status, displayName, betAmount, cashoutFormated, winAmount, currency, clientAvatar } = item;
            return html`
                <div className="bets-row ${status}" key=${playerId}>
                    <div class="bets-cell bets-cell--user"><div class="bets-avatar avatar avatar-${clientAvatar}"></div>${displayName}</div>
                    <div class="bets-cell"><span class="bets-amount text-fit">${this.formatAmount(betAmount, currency)}</span></div>
                    <div class="bets-cell">${this.formatCoeff(cashoutFormated)}</div>
                    <div class="bets-cell bets-cell--win"><span class="bets-win text-fit">${this.formatAmount(winAmount, currency)}</span></div>
                </div>
            `;
        });

        return html`
            <>
                <div id="playersCurrent">${playersCurrent}</div>
                <div id="playersActive" style=${{ height: activeHeight, paddingTop: activePaddingTop, boxSizing: 'border-box' }}>${playersActive}</div>
                <div id="playersCashOut" style=${{ height: cashOutHeight, paddingTop: cashOutPaddingTop, boxSizing: 'border-box' }}>${playersCashOut}</div>
            </>
        `;
    };
}

ReactDOM.render(html`<${App}/>`, document.getElementById('players'));
