"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, Wallet, Target, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Transaction, Account, Budget, Category, User } from "@/types/domain";

interface DashboardContentProps {
  locale: "id" | "en" | "zh" | "ja" | "ko";
  user: User;
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  categories: Category[];
}

export function DashboardContent({
  locale,
  user,
  transactions,
  accounts,
  budgets,
  categories,
}: DashboardContentProps) {
  const t = useTranslations("dashboard");
  const ct = useTranslations("common");

  // Calculate summary
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthlyTransactions = transactions.filter((tx) => tx.date.startsWith(currentMonth));
  const income = monthlyTransactions.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
  const expense = monthlyTransactions.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
  const balance = income - expense;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Recent transactions (last 5)
  const recentTransactions = transactions.slice(0, 5);

  // Budget alerts
  const budgetAlerts = budgets
    .map((budget) => {
      const category = categories.find((c) => c.id === budget.category_id);
      const spent = monthlyTransactions
        .filter((tx) => tx.type === "expense" && tx.category_id === budget.category_id)
        .reduce((sum, tx) => sum + tx.amount, 0);
      const progress = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      return { ...budget, category, spent, progress };
    })
    .filter((b) => b.progress >= (b.alert_threshold || 0.8) * 100)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("welcome").replace("{name}", user.profile?.full_name || "Pengguna")}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/transactions/new?type=income">
              <Plus className="mr-2 h-4 w-4" />
              {ct("income")}
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/transactions/new?type=expense">
              <Plus className="mr-2 h-4 w-4" />
              {ct("expense")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("summary.income")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(income, "IDR", locale === "id" ? "id-ID" : locale === "en" ? "en-US" : locale)}
            </div>
            <p className="text-xs text-muted-foreground">{ct("thisMonth")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("summary.expense")}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(expense, "IDR", locale === "id" ? "id-ID" : locale === "en" ? "en-US" : locale)}
            </div>
            <p className="text-xs text-muted-foreground">{ct("thisMonth")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("summary.balance")}
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: balance >= 0 ? "var(--primary)" : "var(--destructive)" }}>
              {formatCurrency(balance, "IDR", locale === "id" ? "id-ID" : locale === "en" ? "en-US" : locale)}
            </div>
            <p className="text-xs text-muted-foreground">{ct("thisMonth")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("summary.savingsRate")}
            </CardTitle>
            <Target className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {savingsRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">{ct("thisMonth")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Total Balance */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Saldo Keseluruhan</p>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(totalBalance, "IDR", locale === "id" ? "id-ID" : locale === "en" ? "en-US" : locale)}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/accounts">
                {ct("viewAll")} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions + Budget Alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("quickActions.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                asChild
                variant="outline"
                className="h-20 flex-col gap-2 justify-center"
              >
                <Link href="/transactions/new?type=income">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                  <span>{t("quickActions.addIncome")}</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-20 flex-col gap-2 justify-center"
              >
                <Link href="/transactions/new?type=expense">
                  <TrendingDown className="h-6 w-6 text-red-500" />
                  <span>{t("quickActions.addExpense")}</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col gap-2 justify-center">
                <Link href="/transactions">
                  <Wallet className="h-6 w-6 text-blue-500" />
                  <span>{t("quickActions.viewTransactions")}</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col gap-2 justify-center">
                <Link href="/budgets">
                  <Target className="h-6 w-6 text-amber-500" />
                  <span>{t("quickActions.manageBudgets")}</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Budget Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-500" />
              {t("budgetAlerts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {budgetAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Tidak ada peringatan budget
              </p>
            ) : (
              <div className="space-y-3">
                {budgetAlerts.map((alert) => (
                  <div key={alert.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{alert.category?.name}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(alert.spent)} / {formatCurrency(alert.amount)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-500"
                        style={{ width: `${Math.min(alert.progress, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {alert.progress >= 100 ? t("list.overBudget") : t("list.nearLimit")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("recentTransactions")}</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/transactions">
              {ct("viewAll")} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t("noTransactions")}</p>
              <Button asChild className="mt-4">
                <Link href="/transactions/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {ct("addExpense")}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => {
                const category = categories.find((c) => c.id === tx.category_id);
                const account = accounts.find((a) => a.id === tx.account_id);
                const isIncome = tx.type === "income";

                return (
                  <Link
                    key={tx.id}
                    href={`/transactions/${tx.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: category?.color ? `${category.color}20` : "var(--muted)" }}
                      >
                        {category?.icon && (
                          <span
                            className="text-lg"
                            style={{ color: category.color || "var(--foreground)" }}
                          >
                            {category.icon}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{category?.name || "Kategori"}</p>
                        <p className="text-sm text-muted-foreground">
                          {account?.name} • {formatDate(tx.date, locale)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className="font-medium"
                        style={{ color: isIncome ? "var(--primary)" : "var(--destructive)" }}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(tx.amount, "IDR", locale === "id" ? "id-ID" : locale === "en" ? "en-US" : locale)}
                      </p>
                      {tx.note && (
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{tx.note}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}