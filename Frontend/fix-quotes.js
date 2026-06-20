const fs = require('fs');

let file = 'f:/Development/Projects/RideSync/Frontend/app/(driver)/otp-verify.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/Didn't/g, 'Didn&apos;t');
fs.writeFileSync(file, content);

file = 'f:/Development/Projects/RideSync/Frontend/app/(rider)/ride-complete.tsx';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/driver's/g, 'driver&apos;s');
content = content.replace(/how's/g, 'how&apos;s');
fs.writeFileSync(file, content);

file = 'f:/Development/Projects/RideSync/Frontend/app/(rider)/searching-driver.tsx';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/We're/g, 'We&apos;re');
content = content.replace(/driver's/g, 'driver&apos;s');
fs.writeFileSync(file, content);
