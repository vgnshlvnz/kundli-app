# Manual Test Checklist - Kundli Web UI

## Golden Chart Fixture

**Test birth data:**
- Name: Test Person
- Date of Birth: 1990-01-15
- Time of Birth: 10:30:00
- Location: Chennai, India (13.0827°N, 80.2707°E, Asia/Kolkata)

**Expected results (to be verified):**
- Lagna sign: [verify]
- Moon nakshatra: [verify]
- Current Vimshottari mahadasha: [verify]

## Test Steps

### 1. Basic Form Rendering
- [ ] Navigate to `http://localhost:8787` (via `wrangler dev`)
- [ ] Page loads with title "Vedic Kundli Calculator"
- [ ] Settings panel shows three dropdowns (Ayanamsa, House System, Chart Style)
- [ ] Birth form shows name, date, time, and location fields
- [ ] Date field defaults to today's date

### 2. Location Autocomplete
- [ ] Type "Chennai" into birth location field
- [ ] Dropdown appears with location results after typing
- [ ] Select "Chennai, India" from dropdown
- [ ] Timezone displayed under time field (e.g., "Timezone: Asia/Kolkata")

### 3. Calculate Birth Chart
- [ ] Enter birth data (1990-01-15, 10:30:00, Chennai, India)
- [ ] Click "Calculate Kundli"
- [ ] Results section appears below form
- [ ] Rasi (D1) tab is active by default

### 4. Rasi Tab Verification
- [ ] Lagna (Ascendant) sign displayed
- [ ] All 7 planets shown with sign, degree, house, retrograde status
- [ ] Verify lagna sign matches expected result for fixture

### 5. Navamsa Tab
- [ ] Click "Navamsa (D9)" tab
- [ ] Navamsa chart displayed
- [ ] All 7 planets shown with varga positions

### 6. Planets Tab
- [ ] Click "Planets" tab
- [ ] Detailed planet positions shown
- [ ] Includes sign, degree, house, nakshatra, pada, speed
- [ ] Verify Moon nakshatra matches expected result

### 7. Vimshottari Tab
- [ ] Click "Vimshottari" tab
- [ ] Birth year, Moon nakshatra, and current mahadasha displayed
- [ ] Mahadasha timeline table shown
- [ ] Current mahadasha row highlighted
- [ ] Verify current mahadasha matches expected result

### 8. Panchanga Tab
- [ ] Click "Panchanga" tab
- [ ] "At birth" table: tithi, nakshatra (with pada and lord), yoga and karana, each with start → end date and time at the birth place
- [ ] "Hindu day" table: vara, sunrise, sunset, next sunrise, time since sunrise in ghati/vighati, hora lord
- [ ] A pre-sunrise birth (e.g. 03:00) shows the previous day's vara marked "(previous civil day)"
- [ ] "At sunrise" table lists the angas prevailing at that day's sunrise
- [ ] "Calendar" table: lunar month (adhika marked), Tamil month, Tamil date, Tamil year
- [ ] Kshaya/adhika tithi notes appear only when they apply
- [ ] A polar birth (e.g. Tromsø 69.65°N, 18.96°E, 2023-06-21) shows the "does not rise or set" notice and no sunrise rows, with no console errors
- [ ] Switch language to Tamil: every row, including Tamil month and year names, is in Tamil
- [ ] Change ayanamsa: nakshatra/pada/yoga change, tithi/karana and the Tamil date do not

### 9. KP Tab
- [ ] Click "KP" tab
- [ ] Planet sub-lords table displayed
- [ ] House cusp sub-lords table displayed

### 10. Settings Changes
- [ ] Change ayanamsa to "Raman (Krishnamurti)"
- [ ] Chart recalculates automatically
- [ ] Planet positions change
- [ ] Change house system to "Equal"
- [ ] Chart recalculates automatically

### 11. Chart Style Toggle
- [ ] Set chart style to "Basic"
- [ ] Advanced tabs (Navamsa, Vimshottari, Panchanga, KP) hidden
- [ ] Set chart style to "Advanced"
- [ ] All tabs visible again

### 12. Print/PDF Output
- [ ] Calculate a chart
- [ ] Press Ctrl+P (or Cmd+P) to open print dialog
- [ ] Preview shows all tabs' content
- [ ] Form and settings are hidden in print preview
- [ ] Clean layout suitable for PDF export

### 13. Keyboard Accessibility
- [ ] Tab through all form fields
- [ ] Enter date/time using keyboard
- [ ] Select location via keyboard navigation
- [ ] Submit form with Enter key
- [ ] Switch tabs with keyboard

### 14. Mobile Responsive
- [ ] Resize browser window to mobile width (< 480px)
- [ ] Layout stacks vertically
- [ ] All content still accessible
- [ ] Location autocomplete still works

## Verification

After completing all tests, verify the golden chart results against a known reference (e.g., online Vedic astrology calculator or reference software like Jagannatha Hora).

**Reference values for golden chart (fill in after verification):**
- Lagna sign: 
- Moon nakshatra: 
- Current Vimshottari mahadasha: