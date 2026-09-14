"use client";

import { useState } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { CheckSquare, Plus, Trash2, CheckCircle2, ChevronRight, Activity } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPlanner, createPlannerItem, realizePlannerItem, deletePlannerItem } from "./actions";

export function PlannerContent({ user, initialPlanners, initialItems, accounts, categories }: any) {
  const [activeTab, setActiveTab] = useState(initialPlanners[0]?.id || "new");
  
  // Modals state
  const [isAddTabOpen, setIsAddTabOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  
  const [activeCategory, setActiveCategory] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Form states
  const [tabTitle, setTabTitle] = useState("");
  const [itemData, setItemData] = useState({ name: "", amount: "", type: "expense", tag: "" });
  const [payData, setPayData] = useState({ accountId: "", categoryId: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activePlanner = initialPlanners.find((p: any) => p.id === activeTab);
  const activeItems = initialItems.filter((i: any) => i.planner_id === activeTab);

  const handleAddTab = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const p = await createPlanner(tabTitle, "", "");
      setActiveTab(p.id);
      setIsAddTabOpen(false);
      setTabTitle("");
    } catch (e) {
      alert("Error adding planner");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItem = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createPlannerItem(activeTab, activeCategory, itemData.type as any, itemData.name, Number(itemData.amount), itemData.tag);
      setIsAddItemOpen(false);
      setItemData({ name: "", amount: "", type: "expense", tag: "" });
    } catch (e) {
      alert("Error adding item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePay = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await realizePlannerItem(selectedItem.id, selectedItem.amount, selectedItem.type, selectedItem.name, payData.accountId, payData.categoryId);
      setIsPayOpen(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsSubmitting(true);
    try {
      await deletePlannerItem(itemToDelete.id);
      setItemToDelete(null);
    } catch (e: any) {
      alert("Gagal menghapus: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const renderGroup = (catName: string, catKey: string, type: string) => {
    const items = activeItems.filter((i: any) => i.category === catKey);
    const subtotal = items.reduce((sum: number, i: any) => sum + Number(i.amount), 0);
    const isExpense = type === 'expense';

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{catName}</h2>
          <Button variant="ghost" size="sm" onClick={() => { setActiveCategory(catKey); setItemData({...itemData, type}); setIsAddItemOpen(true); }} className="h-6 text-xs text-primary">
            + Tambah
          </Button>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm divide-y divide-border/50">
          {items.map((item: any) => {
            const isLunas = item.status_tag?.includes("lunas") || item.status_tag?.includes("diterima");
            return (
              <div key={item.id} className={cn("flex flex-col justify-center p-4 group transition-colors hover:bg-secondary/20", isLunas && "bg-green-500/5")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-semibold text-sm", isLunas && "line-through text-muted-foreground")}>{item.name}</span>
                    {item.status_tag && (
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded", isLunas ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-500")}>
                        {item.status_tag}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("font-bold text-sm", isLunas ? "text-muted-foreground" : (item.type === 'expense' ? "text-red-500" : "text-green-500"))}>
                      {item.type === 'expense' ? "-" : "+"}{formatCurrency(item.amount)}
                    </span>
                    {!isLunas && (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        className="h-7 text-[10px] px-2 rounded-full font-bold hover:bg-primary hover:text-primary-foreground" 
                        onClick={() => { setSelectedItem(item); setIsPayOpen(true); }}
                      >
                        <CheckSquare className="h-3 w-3 mr-1" /> {item.type === 'expense' ? "Bayar" : "Terima"}
                      </Button>
                    )}
                    <button onClick={() => setItemToDelete(item)} className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
             <div className="p-4 text-center text-sm text-muted-foreground">Belum ada data</div>
          )}
          <div className="flex items-center justify-between p-4 bg-secondary/30">
            <span className="font-bold text-sm">Subtotal {catName}</span>
            <span className={cn("font-bold text-sm", isExpense ? "text-red-500" : "text-green-500")}>
              {isExpense ? "-" : "+"}{formatCurrency(subtotal)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const totalIncome = activeItems.filter((i:any) => i.type === 'income').reduce((s:number, i:any) => s + Number(i.amount), 0);
  const totalExpense = activeItems.filter((i:any) => i.type === 'expense').reduce((s:number, i:any) => s + Number(i.amount), 0);
  const sisa = totalIncome - totalExpense;

  return (
    <div className="space-y-6 pb-24 p-4 md:p-6 lg:p-8 max-w-3xl mx-auto bg-background/50 min-h-screen">
      
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            📊 Rencana Bulanan
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Sistem Proyeksi & Realisasi 1-Click</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide items-center">
        {initialPlanners.map((p: any) => (
          <button
            key={p.id}
            onClick={() => setActiveTab(p.id)}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border",
              activeTab === p.id 
                ? "bg-foreground text-background border-foreground shadow-md" 
                : "bg-card text-muted-foreground border-border/50 hover:bg-secondary"
            )}
          >
            {p.title}
          </button>
        ))}
        <button onClick={() => setIsAddTabOpen(true)} className="px-3 py-2 rounded-xl text-sm font-semibold border border-dashed border-border/50 text-muted-foreground hover:bg-secondary flex items-center gap-1">
          <Plus className="h-4 w-4" /> Bulan Baru
        </button>
      </div>

      {!activePlanner ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
          <div className="text-6xl mb-4">📓</div>
          <h2 className="text-xl font-bold">Belum ada Rencana</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
            Buat tab bulan baru untuk mulai merencanakan pengeluaran Anda.
          </p>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Summaries */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-muted-foreground mb-1">Total Pemasukan</p>
              <p className="text-sm md:text-base font-bold text-green-500">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-muted-foreground mb-1">Total Pengeluaran</p>
              <p className="text-sm md:text-base font-bold text-red-500">{formatCurrency(totalExpense)}</p>
            </div>
            <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-muted-foreground mb-1">Sisa Proyeksi</p>
              <p className={cn("text-sm md:text-base font-bold", sisa >= 0 ? "text-green-500" : "text-red-500")}>
                {sisa >= 0 ? "+" : ""}{formatCurrency(sisa)}
              </p>
            </div>
          </div>

          {renderGroup("Pemasukan", "income", "income")}
          {renderGroup("Wajib — Prioritas", "wajib", "expense")}
          {renderGroup("Tabungan & Investasi", "tabungan", "expense")}
          {renderGroup("Kebutuhan Pribadi", "kebutuhan", "expense")}
          
        </div>
      )}

      {/* MODAL ADD TAB */}
      <Dialog open={isAddTabOpen} onOpenChange={setIsAddTabOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>Buat Rencana Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTab} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Bulan / Rencana</Label>
              <Input placeholder="Contoh: Agustus 2026" required value={tabTitle} onChange={e => setTabTitle(e.target.value)} />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>Simpan</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL ADD ITEM */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>Tambah Item ke Rencana</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Item</Label>
              <Input placeholder="Contoh: Uang Dapur" required value={itemData.name} onChange={e => setItemData({...itemData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Jumlah (Rp)</Label>
              <Input type="number" required value={itemData.amount} onChange={e => setItemData({...itemData, amount: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Label / Tag (Opsional)</Label>
              <Input placeholder="Contoh: skip!, lunas, terbatas" value={itemData.tag} onChange={e => setItemData({...itemData, tag: e.target.value})} />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>Tambah</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 1-CLICK PAY */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Eksekusi Realisasi!
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <form onSubmit={handlePay} className="space-y-4">
              <div className="bg-secondary/30 p-4 rounded-xl space-y-1">
                <p className="text-xs text-muted-foreground">Item yang direalisasikan:</p>
                <p className="font-bold">{selectedItem.name}</p>
                <p className={cn("text-lg font-black", selectedItem.type === 'expense' ? "text-red-500" : "text-green-500")}>
                  {selectedItem.type === 'expense' ? "-" : "+"}{formatCurrency(selectedItem.amount)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Pilih Sumber Akun / Dompet</Label>
                <Select required onValueChange={v => setPayData({...payData, accountId: v})}>
                  <SelectTrigger><SelectValue placeholder="Pilih Akun" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a:any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pilih Kategori Transaksi</Label>
                <Select required onValueChange={v => setPayData({...payData, categoryId: v})}>
                  <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                  <SelectContent>
                    {categories.filter((c:any) => c.type === selectedItem.type).map((c:any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPayOpen(false)} className="rounded-full">Batal</Button>
                <Button type="submit" className="rounded-full" disabled={isSubmitting}>
                  Ya, Eksekusi ke Transaksi!
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL HAPUS ITEM */}
      <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">Apakah Anda yakin ingin menghapus <strong>{itemToDelete?.name}</strong>?</p>
            <p className="text-xs mt-2 text-destructive">Tindakan ini tidak dapat dibatalkan.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemToDelete(null)} className="rounded-full">Batal</Button>
            <Button variant="destructive" onClick={confirmDelete} className="rounded-full" disabled={isSubmitting}>
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
