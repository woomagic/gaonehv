# Walkthrough: Continuous Current Ratings Calculator

I have successfully built the single-page web calculator based on your exact specifications.

## What was built
The calculator is comprised of HTML, CSS, and Javascript, and resides in the artifacts directory.
- `index.html`: Contains all the necessary input fields without any calculation buttons. Real-time updating was added.
- `styles.css`: Implements a premium, modern dark-mode aesthetic with hover micro-interactions, clean typography, and a glassmorphism layout, prioritizing visual excellence.
- `script.js`: Contains the underlying logic matching the Excel-style approach.

## Implementation Details & Validation
### 1. Embedded IEC 60287 Anchor Table
The table was completely hard-coded. This was necessary to lock in the 1500 mm depth anchor values.

### 2. Continuous Base Formula
Calculations that don't match the exact anchor points employ a smooth, continuous formula. Ampacity factors for depth, voltage, area, and bonding smoothly decrease logarithmic values or power laws depending on parameters.

### 3. Calibration to Exact Table
I used Inverse Distance Weighting (IDW) interpolation between available anchors of the same bonding method. This correctly provides the nearest calibration factor, ensuring:
- **Exact Matches**: at 1500mm depth with the defined anchor voltages, bonding types, and area points, the base formula is overridden and it displays the exact value.
- **Continuous Values**: at all intermediate selections. 

### 4. Mathematical Rules and Output Validation
- **Circuit Derating**: Implemented exact scaling (`1: 1.0, 2: 0.89, 3: 0.87, 4+: 0.83`).
- **Apparent & Active Power**: Solved and auto-updated (`S` and `P`).
- **No Invalid Values**: Inputs gracefully handle bad cases. Nan, negative numbers, or invalid inputs output `0.0` safely.
- **Single <= Cross Bonding Rule**: During every calculation, if Single Point Bonding is requested, it tests the Cross Bonding result automatically. If the Single Point exceeds it, it's artificially capped to the exact Cross Bonding theoretical maximum.

## Visual Demo
Below is the UI structure demonstrating the sleek interface:

> [!NOTE]
> The modern UI features glowing input focus states and dynamic background gradients, perfectly fitted for modern utility applications.

You may test the application by opening the `index.html` file in a browser.
