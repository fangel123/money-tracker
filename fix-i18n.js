const fs = require('fs');
const path = require('path');

const locales = ['id', 'en'];
const dir = path.join(__dirname, 'src/messages');

locales.forEach(loc => {
  const file = path.join(dir, `${loc}.json`);
  if (!fs.existsSync(file)) return;
  
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  // TRANSACTIONS
  if (!data.transactions.header) data.transactions.header = {};
  if (!data.transactions.filters) data.transactions.filters = {};
  
  data.transactions.header.description = loc === 'id' ? "Kelola semua pemasukan dan pengeluaran Anda" : "Manage all your income and expenses";
  
  data.transactions.filters.title = loc === 'id' ? "Filter" : "Filters";
  data.transactions.filters.searchPlaceholder = loc === 'id' ? "Cari transaksi..." : "Search transactions...";
  data.transactions.filters.typeLabel = loc === 'id' ? "Tipe" : "Type";
  data.transactions.filters.typeAll = loc === 'id' ? "Semua Tipe" : "All Types";
  data.transactions.filters.typeIncome = loc === 'id' ? "Pemasukan" : "Income";
  data.transactions.filters.typeExpense = loc === 'id' ? "Pengeluaran" : "Expense";
  data.transactions.filters.categoryLabel = loc === 'id' ? "Kategori" : "Category";
  data.transactions.filters.categoryAll = loc === 'id' ? "Semua Kategori" : "All Categories";
  data.transactions.filters.accountLabel = loc === 'id' ? "Akun" : "Account";
  data.transactions.filters.accountAll = loc === 'id' ? "Semua Akun" : "All Accounts";
  data.transactions.filters.sortLabel = loc === 'id' ? "Urutkan" : "Sort By";
  data.transactions.filters.sortDateDesc = loc === 'id' ? "Terbaru" : "Newest First";
  data.transactions.filters.sortDateAsc = loc === 'id' ? "Terlama" : "Oldest First";
  data.transactions.filters.sortAmountDesc = loc === 'id' ? "Terbesar" : "Highest Amount";
  data.transactions.filters.sortAmountAsc = loc === 'id' ? "Terkecil" : "Lowest Amount";

  // ACCOUNTS
  if (!data.accounts.header) data.accounts.header = {};
  data.accounts.header.description = loc === 'id' ? "Pantau semua dompet dan rekening Anda" : "Monitor all your wallets and accounts";

  // BUDGETS
  if (!data.budgets.header) data.budgets.header = {};
  data.budgets.header.description = loc === 'id' ? "Kelola batas pengeluaran Anda" : "Manage your spending limits";

  // CATEGORIES
  if (!data.categories.header) data.categories.header = {};
  data.categories.header.description = loc === 'id' ? "Kustomisasi ikon dan warna pengeluaran" : "Customize income and expense categories";
  
  if (!data.categories.tabs) data.categories.tabs = {};
  data.categories.tabs.expense = loc === 'id' ? "Pengeluaran" : "Expense";
  data.categories.tabs.income = loc === 'id' ? "Pemasukan" : "Income";

  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated ${loc}.json successfully.`);
});
