window.onerror = function (message, source, lineno, colno, error) {
    alert(`Global Error: ${message} at line ${lineno}`);
};

document.addEventListener('DOMContentLoaded', () => {
    try {
        // DOM Elements
        const voltageSelect = document.getElementById('voltage');
        const sqSelect = document.getElementById('sq');
        const circuitsInput = document.getElementById('circuits');
        const depthInput = document.getElementById('depth');
        const pfInput = document.getElementById('pf');
        // const calculateBtn = document.getElementById('calculate-btn'); // Removed
        const resultAmpere = document.getElementById('result-ampere');
        const resultMva = document.getElementById('result-mva');
        const errorMessage = document.getElementById('error-message');

        if (!voltageSelect || !sqSelect) {
            console.error("Critical elements missing");
            return;
        }

        // Constants & Data
        // Insulation Thickness Estimation (mm) based on Voltage (kV)
        // Approximation derived from standard cable data
        const insulationThickness = {
            66: 11,
            132: 16,
            154: 19,
            220: 23,
            345: 29
        };

        // Inputs that auto-trigger calculation
        [voltageSelect, sqSelect, circuitsInput, depthInput, pfInput].forEach(el => {
            if (el) {
                el.addEventListener('change', calculateCableCapacity);
                el.addEventListener('input', calculateCableCapacity);
            }
        });


        // Button removed, auto-calculation is sufficient
        // calculateBtn.addEventListener('click', () => { ... });

        function calculateCableCapacity() {
            try {
                // Clear errors
                if (errorMessage) {
                    errorMessage.classList.add('hidden');
                    errorMessage.textContent = '';
                }

                // 1. Get Inputs
                const voltage = parseInt(voltageSelect.value);
                const sq = parseInt(sqSelect.value);
                const n = parseInt(circuitsInput.value);
                const depth = parseFloat(depthInput.value);
                const pf = parseFloat(pfInput.value);

                // Validation
                if (isNaN(n) || n <= 0) throw new Error("Circuits must be > 0");
                if (isNaN(depth) || depth <= 0) throw new Error("Depth must be > 0");
                if (isNaN(pf) || pf < 0 || pf > 1) throw new Error("PF must be 0-1");

                // 2. Calculate Cable Parameters (Dc, Di, R0)
                // Dc (Conductor Diameter) approximation: d = sqrt(4 * A / pi).
                // Multiply by ~1.1 for conductor construction (stranding/compacting factor)
                const dc_approx = Math.sqrt(4 * sq / Math.PI) * 1.1;
                // Round to 1 decimal place
                const dc = Math.round(dc_approx * 10) / 10;

                // Di (Insulation Diameter) = Dc + 2 * Thickness
                const thickness = insulationThickness[voltage] || (voltage * 0.1); // Fallback
                const di = dc + 2 * thickness;

                // R0 (DC Resistance at 20C)
                // R = rho / A. For Copper, ~ 18.51 Ohm*mm^2/km
                // R0 (Ohm/m) = (18.51 / sq) / 1000
                const r0 = (18.51 / sq) / 1000;

                // 3. Calculation
                const f = 60;
                const alpha20 = 0.00393;

                // AC Resistance (90°C)
                const r_ac = r0 * (1 + alpha20 * 70) * 1.059;

                // Dielectric Loss
                const u0 = (voltage * 1000) / Math.sqrt(3);
                const c = (2 * Math.PI * 8.854e-12 * 2.3) / Math.log(di / dc) * 1000;
                // wd calculation (results in W/km because c is F/km)
                const wd_per_km = 2 * Math.PI * f * c * Math.pow(u0, 2) * 0.001;
                const wd = wd_per_km / 1000; // Convert to W/m for thermal calculation

                // Thermal Resistance
                const t1 = (3.5 / (2 * Math.PI)) * Math.log(di / dc);
                const t3 = (6.0 / (2 * Math.PI)) * Math.log((di + 20) / di);

                const t4_base_map = { 1: 1.163, 2: 1.619, 3: 1.641, 4: 1.885 };
                let t4_base = t4_base_map[n] !== undefined ? t4_base_map[n] : (1.885 + (n - 4) * 0.1);

                const t4 = t4_base + (0.9 / (2 * Math.PI)) * Math.log(depth / 1200.0) * (1 + 0.1 * (n - 1));

                const lambda1 = 0.291;

                // 4. Result
                const delta_theta = 65;
                const numerator = delta_theta - wd * (0.5 * t1 + t3 + t4);
                const denominator = r_ac * (t1 + (1 + lambda1) * (t3 + t4));

                if (numerator <= 0) {
                    throw new Error("Thermal imbalance: numerator <= 0");
                }

                const i_ampere = Math.sqrt(numerator / denominator);
                const p_mva = Math.sqrt(3) * voltage * i_ampere * n * pf / 1000.0;

                // Update UI
                updateValue(resultAmpere, i_ampere);
                updateValue(resultMva, p_mva);

            } catch (e) {
                showError(e.message);
                console.error(e);
            }
        }

        function showError(msg) {
            if (errorMessage) {
                errorMessage.textContent = msg;
                errorMessage.classList.remove('hidden');
            }
        }

        function updateValue(element, value) {
            if (element) element.textContent = value.toFixed(1);
        }

        // Initial run
        calculateCableCapacity();

    } catch (err) {
        alert("Script Initialization Error: " + err.message);
    }
});
