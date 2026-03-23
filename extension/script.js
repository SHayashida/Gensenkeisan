document.addEventListener('DOMContentLoaded', () => {
    const amountInput = document.getElementById('amount');
    const taxTypeRadios = document.getElementsByName('taxType');
    
    const resAmount = document.getElementById('res-amount');
    const resTax = document.getElementById('res-tax');
    const resWithholding = document.getElementById('res-withholding');
    const resTotal = document.getElementById('res-total');
    
    const copyBtns = document.querySelectorAll('.copy-icon');
    const copyAllBtn = document.getElementById('copy-all-btn');
    const toast = document.getElementById('toast');
    
    const THRESHOLD = 1000000;
    const RATE_LOW = 0.1021;
    const RATE_HIGH = 0.2042;
    const FIXED_TAX = 102100;
    
    let lastCalculated = {
        amount: 0,
        tax: 0,
        withholding: 0,
        total: 0
    };

    function formatNumber(num) {
        return Math.floor(num).toLocaleString('ja-JP');
    }

    function calculate() {
        // Remove non-numeric characters first (except first minus sign if any, though here only positive)
        const rawValue = amountInput.value.replace(/[^\d]/g, '');
        if (!rawValue) {
            resAmount.innerText = '0';
            resTax.innerText = '0';
            resWithholding.innerText = '0';
            resTotal.innerText = '0';
            return;
        }

        const value = parseInt(rawValue, 10);
        
        // Re-format the input to have commas while user is typing
        const cursorPosition = amountInput.selectionStart;
        const originalLength = amountInput.value.length;
        const formattedInputValue = value.toLocaleString('ja-JP');
        
        amountInput.value = formattedInputValue;
        
        // Adjust cursor position after inserting commas
        const newLength = amountInput.value.length;
        if (document.activeElement === amountInput) {
            amountInput.setSelectionRange(cursorPosition + (newLength - originalLength), cursorPosition + (newLength - originalLength));
        }

        let taxType = 'exclusive';
        for (const radio of taxTypeRadios) {
            if (radio.checked) taxType = radio.value;
        }

        let tax = 0;
        let withholdingThresholdMet = false;
        let withholding = 0;
        let startBaseAmount = value;

        if (taxType === 'exclusive') {
            tax = Math.floor(value * 0.1);
        } else {
            // For tax-inclusive, tax separates 0 in standard invoice where tax is not strictly partitioned out of the body
            tax = 0;
        }

        // The base amount for withholding is the raw billing amount in standard cases 
        // whether tax-exclusive or tax-inclusive.
        const baseForWithholding = value;

        if (baseForWithholding <= THRESHOLD) {
            withholding = Math.floor(baseForWithholding * RATE_LOW);
        } else {
            withholding = Math.floor((baseForWithholding - THRESHOLD) * RATE_HIGH + FIXED_TAX);
        }

        const total = (value + tax) - withholding;

        lastCalculated = {
            amount: value,
            tax,
            withholding,
            total
        };

        resAmount.innerText = formatNumber(value);
        resTax.innerText = tax > 0 ? formatNumber(tax) : "（込み）";
        resWithholding.innerText = formatNumber(withholding);
        resTotal.innerText = formatNumber(total);
    }

    amountInput.addEventListener('input', calculate);
    for (const radio of taxTypeRadios) {
        radio.addEventListener('change', calculate);
    }

    function showToast(message) {
        toast.innerText = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('コピーしました');
        }).catch(err => {
            console.error('Copy failed', err);
        });
    }

    copyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.getAttribute('data-target');
            let textValue = '';
            
            if (targetId === 'res-amount') textValue = lastCalculated.amount.toString();
            if (targetId === 'res-tax') textValue = lastCalculated.tax.toString();
            if (targetId === 'res-withholding') textValue = lastCalculated.withholding.toString();
            if (targetId === 'res-total') textValue = lastCalculated.total.toString();
            
            copyToClipboard(textValue);
        });
    });

    copyAllBtn.addEventListener('click', () => {
        const typeStr = document.querySelector('input[name="taxType"]:checked').value === 'exclusive' ? '税別' : '税込';
        const formatted = `請求金額（${typeStr}）: ${formatNumber(lastCalculated.amount)}円
消費税額: ${lastCalculated.tax === 0 ? '（込み）' : formatNumber(lastCalculated.tax) + '円'}
源泉徴収税額: ${formatNumber(lastCalculated.withholding)}円
差引支払金額: ${formatNumber(lastCalculated.total)}円`;
        copyToClipboard(formatted);
    });
});
