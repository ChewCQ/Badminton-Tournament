const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const adminDir = path.join(srcDir, 'app', 'admin');
const newAdminDir = path.join(srcDir, 'app', 'hq-admin-v2');

// 1. Rename directory
if (fs.existsSync(adminDir)) {
  fs.renameSync(adminDir, newAdminDir);
  console.log('Renamed src/app/admin to src/app/hq-admin-v2');
}

// 2. Find and replace in all .ts and .tsx files
function walkAndReplace(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkAndReplace(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Replace "/admin" -> "/hq-admin-v2"
      // Replace "/admin/" -> "/hq-admin-v2/"
      // Be careful not to replace something like "TournyAdmin"
      
      if (content.includes('/admin')) {
        // Regex matches exactly "/admin" or starts with "/admin/"
        const newContent = content.replace(/'\/admin'/g, "'/hq-admin-v2'")
                                  .replace(/"\/admin"/g, '"/hq-admin-v2"')
                                  .replace(/'\/admin\//g, "'/hq-admin-v2/")
                                  .replace(/"\/admin\//g, '"/hq-admin-v2/')
                                  .replace(/`\/admin`/g, "`/hq-admin-v2`")
                                  .replace(/`\/admin\//g, "`/hq-admin-v2/");
        
        if (newContent !== content) {
          fs.writeFileSync(filePath, newContent, 'utf8');
          console.log('Updated references in:', filePath);
        }
      }
    }
  }
}

walkAndReplace(srcDir);
console.log('Refactoring complete.');
