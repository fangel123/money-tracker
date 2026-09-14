const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
const searchString = '"id" | "en" | "zh" | "ja" | "ko"';
const replacement = '"id" | "en"';

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes(searchString)) {
    content = content.split(searchString).join(replacement);
    fs.writeFileSync(f, content, 'utf8');
    console.log('Updated ' + f);
  }
});
