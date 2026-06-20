const fs = require('fs');

const files = [
  'f:/Development/Projects/RideSync/Frontend/app/(driver)/active-ride.tsx',
  'f:/Development/Projects/RideSync/Frontend/app/(rider)/create-ride.tsx',
  'f:/Development/Projects/RideSync/Frontend/app/(rider)/live-tracking.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/\(colorScheme === 'light' \? '#6B7280' : '#748096'\)/g, '"#748096"');
  fs.writeFileSync(f, content);
  console.log('Fixed map style in ' + f);
});
