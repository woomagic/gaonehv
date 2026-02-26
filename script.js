const IEC_TABLE = {
    66: {
        "Single Point Bonding": { 150: 374, 185: 377, 240: 416, 600: 564 }
    },
    132: {
        "Cross Bonding": { 400: 542, 800: 1004, 1000: 1136, 1200: 1210, 1600: 1352 }
    },
    138: {
        "Cross Bonding": { 300: 608, 630: 892, 800: 998 }
    },
    154: {
        "Cross Bonding": { 400: 683, 600: 853, 800: 993, 1000: 1097, 1200: 1167, 2000: 1384, 2500: 1590 },
        "Single Point Bonding": { 400: 517 }
    },
    220: {
        "Cross Bonding": { 630: 873, 1200: 1215 },
        "Single Point Bonding": { 630: 583 }
    }
};

let anchors = [];
for (let v in IEC_TABLE) {
    for (let b in IEC_TABLE[v]) {
        for (let a in IEC_TABLE[v][b]) {
            anchors.push({ v: parseFloat(v), b: b, a: parseFloat(a), i: IEC_TABLE[v][b][a] });
        }
    }
}

function getBaseCurrent(v, a, depth, b) {
    let K = 35.0;
    // f(depth): logarithmically decays as depth increases
    let depthFactor = 1 - 0.1 * Math.log(depth / 1500);
    if (depthFactor < 0.1) depthFactor = 0.1; // lower boundary to prevent negatives
    // f(voltage): mild power-law
    let voltageFactor = Math.pow(154 / v, 0.1);
    // f(bonding)
    let bondingFactor = (b === "Single Point Bonding") ? 0.8 : 1.0;

    return K * Math.sqrt(a) * depthFactor * voltageFactor * bondingFactor;
}

// 3. Calibration to table: pre-calculate anchor C factors
anchors.forEach(anch => {
    let i_base = getBaseCurrent(anch.v, anch.a, 1500, anch.b);
    anch.c = anch.i / i_base;
});

function calculate() {
    let v = parseFloat(document.getElementById('voltage').value);
    let a = parseFloat(document.getElementById('area').value);
    let b = document.getElementById('bonding').value;
    let depth = parseFloat(document.getElementById('depth').value);
    let circuits = parseInt(document.getElementById('circuits').value);
    let pf = parseFloat(document.getElementById('pf').value);

    if (isNaN(v) || isNaN(a) || isNaN(depth) || depth <= 0 || isNaN(circuits) || circuits <= 0 || isNaN(pf) || pf <= 0) {
        displayResults(0, 0, 0);
        return;
    }

    let i_final = getCalibratedCurrent(v, a, depth, b, circuits);

    // Rule: Single Point Bonding must never exceed Cross Bonding
    if (b === "Single Point Bonding") {
        let i_cb = getCalibratedCurrent(v, a, depth, "Cross Bonding", circuits);
        if (i_final > i_cb) {
            i_final = i_cb;
        }
    }

    // 5. Power Calculation
    let s = Math.sqrt(3) * v * i_final / 1000;
    let p = s * pf;

    displayResults(i_final, s, p);
}

function getCalibratedCurrent(v, a, depth, b, circuits) {
    // 1. Anchor Override (highest priority)
    if (depth === 1500) {
        let exactAnchor = anchors.find(x => x.v === v && x.a === a && x.b === b);
        if (exactAnchor) {
            return exactAnchor.i * getCircuitDerating(circuits);
        }
    }

    let validAnchors = anchors.filter(x => x.b === b);
    if (validAnchors.length === 0) {
        validAnchors = anchors.filter(x => x.b === "Cross Bonding");
    }

    let c_interp = 1.0;
    let exactPoint = validAnchors.find(x => x.v === v && x.a === a);

    // 3. Interp calibration factor
    if (exactPoint) {
        c_interp = exactPoint.c;
    } else if (validAnchors.length > 0) {
        let sumW = 0, sumWC = 0;
        validAnchors.forEach(anch => {
            let dv = (v - anch.v) / 154.0;
            let da = (a - anch.a) / 1000.0;
            let distSq = dv * dv + da * da;
            let w = 1.0 / distSq;
            sumW += w;
            sumWC += w * anch.c;
        });
        if (sumW > 0) c_interp = sumWC / sumW;
    }

    let i_base = getBaseCurrent(v, a, depth, b);
    let i_calibrated = i_base * c_interp;

    // 4. Circuit Derating
    return i_calibrated * getCircuitDerating(circuits);
}

function getCircuitDerating(circuits) {
    if (circuits === 1) return 1.00;
    if (circuits === 2) return 0.89;
    if (circuits === 3) return 0.87;
    return 0.83;
}

function displayResults(i, s, p) {
    i = (isNaN(i) || i < 0) ? 0 : i;
    s = (isNaN(s) || s < 0) ? 0 : s;
    p = (isNaN(p) || p < 0) ? 0 : p;

    document.getElementById('out-current').innerText = i.toFixed(1) + " A";
    document.getElementById('out-apparent').innerText = s.toFixed(1) + " MVA";
    document.getElementById('out-active').innerText = p.toFixed(1) + " MW";
}

document.addEventListener("DOMContentLoaded", () => {
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', calculate);
        input.addEventListener('change', calculate);
    });

    calculate();
});
