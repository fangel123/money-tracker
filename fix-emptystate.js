const fs = require('fs');
const path = require('path');

const files = [
  'src/app/[locale]/(app)/budgets/BudgetsContent.tsx',
  'src/app/[locale]/(app)/accounts/AccountsContent.tsx',
  'src/app/[locale]/(app)/transactions/TransactionsContent.tsx',
  'src/app/[locale]/(app)/categories/CategoriesContent.tsx'
];

const iconsMap = {
  '"target"': '<Target className="h-12 w-12" />',
  '"wallet"': '<Wallet className="h-12 w-12" />',
  '"receipt"': '<Search className="h-12 w-12" />', // we imported Search not receipt
  '"layers"': '<Square className="h-12 w-12" />'  // we imported Square
};

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Quick fix for the specific icons
    if (file.includes('TransactionsContent.tsx')) {
        content = content.replace('icon="receipt"', 'icon={<Search className="h-12 w-12" />}');
    }
    else if (file.includes('BudgetsContent.tsx')) {
        content = content.replace('icon="target"', 'icon={<Target className="h-12 w-12" />}');
    }
    else if (file.includes('AccountsContent.tsx')) {
        content = content.replace('icon="wallet"', 'icon={<Wallet className="h-12 w-12" />}');
    }
    else if (file.includes('CategoriesContent.tsx')) {
        content = content.replace('icon="layers"', 'icon={<Square className="h-12 w-12" />}');
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', file);
  }
});
