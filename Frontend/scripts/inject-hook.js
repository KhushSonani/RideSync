const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  "..\\app\\(auth)\\_layout.tsx",
  "..\\app\\(driver)\\active-ride.tsx",
  "..\\app\\(driver)\\documents.tsx",
  "..\\app\\(driver)\\home.tsx",
  "..\\app\\(driver)\\otp-verify.tsx",
  "..\\app\\(driver)\\profile.tsx",
  "..\\app\\(driver)\\ride-complete.tsx",
  "..\\app\\(driver)\\ride-request-modal.tsx",
  "..\\app\\(driver)\\_layout.tsx",
  "..\\app\\(rider)\\create-ride.tsx",
  "..\\app\\(rider)\\driver-assigned.tsx",
  "..\\app\\(rider)\\live-tracking.tsx",
  "..\\app\\(rider)\\profile.tsx",
  "..\\app\\(rider)\\ride-complete.tsx",
  "..\\app\\(rider)\\searching-driver.tsx",
  "..\\app\\(rider)\\_layout.tsx",
  "..\\app\\index.tsx",
  "..\\app\\location-search.tsx",
  "..\\app\\onboarding.tsx",
  "..\\app\\sandbox.tsx",
  "..\\components\\common\\FirstRideCTA.tsx",
  "..\\components\common\\RideHistoryCard.tsx",
  "..\\components\\ride\\DriverInfoCard.tsx",
  "..\\components\\ride\\LocationSearchInput.tsx",
  "..\\components\\ride\\OTPDisplay.tsx",
  "..\\components\\ride\\OTPInput.tsx",
  "..\\components\\ride\\RiderInfoCard.tsx",
  "..\\components\\ride\\RideStatusCard.tsx"
];

for (const relPath of filesToUpdate) {
    const filePath = path.join(__dirname, relPath);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if colorScheme is already used
    if (content.includes("const colorScheme =") || content.includes("useColorScheme")) {
        // If it's already defined inside the component we might be fine, or we can check if it's imported.
        // Actually we just skip if it's already there to avoid duplicates.
        continue;
    }

    // Find the main component declaration
    // Usually: export default function XYZ() { or export function XYZ() { or const XYZ = ({...}) => {
    
    let injected = false;

    content = content.replace(/(export\s+(default\s+)?function\s+[a-zA-Z0-9_]+\s*\([^)]*\)\s*\{)/, (match) => {
        injected = true;
        return match + "\n    const colorScheme = require('react-native').useColorScheme();";
    });

    if (!injected) {
        content = content.replace(/(const\s+[a-zA-Z0-9_]+\s*=\s*\([^)]*\)\s*=>\s*\{)/, (match) => {
            injected = true;
            return match + "\n    const colorScheme = require('react-native').useColorScheme();";
        });
    }

    if (injected) {
        fs.writeFileSync(filePath, content);
        console.log("Injected into: " + relPath);
    } else {
        console.log("Failed to inject into: " + relPath);
    }
}
