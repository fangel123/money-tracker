"use client";

import { useState } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { Mascot } from "@/components/common/Mascot";
import { CheckSquare, Plus, Trash2, CheckCircle2, ChevronRight, Activity, MoreVertical, Edit, Copy } from "lucide-react";
import { CartoonBar } from "@/components/common/HeroCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createPlanner, createPlannerItem, realizePlannerItem, unrealizePlannerItem, updatePlannerItem, deletePlannerItem, updatePlanner, deletePlanner, carryOverUnpaidItems } from "./actions";

const INDONESIAN_MONTHS = [
  "januari", "februari", "maret", "april", "mei", "juni",
  "juli", "agustus", "september", "oktober", "november", "desember",
];

// Coba tebak nama bulan berikutnya dari judul planner sekarang, mis. "September 2026" -> "Oktober 2026".
// Kalau polanya tidak ketemu, fallback ke "<judul lama> (Lanjutan)".
function guessNextMonthTitle(currentTitle: string): string {
  const match = currentTitle.match(/([A-Za-zÀ-ÿ]+)\s+(\d{4})/);
  if (match) {
    const monthIdx = INDONESIAN_MONTHS.indexOf(match[1].toLowerCase());
    if (monthIdx !== -1) {
      const year = parseInt(match[2], 10);
      const nextMonthIdx = (monthIdx + 1) % 12;
      const nextYear = nextMonthIdx === 0 ? year + 1 : year;
      const capitalized = INDONESIAN_MONTHS[nextMonthIdx].charAt(0).toUpperCase() + INDONESIAN_MONTHS[nextMonthIdx].slice(1);
      return `${capitalized} ${nextYear}`;
    }
  }
  return `${currentTitle} (Lanjutan)`;
}

const GROUP_COLORS: Record<string, string> = { income: "#9be7c4", wajib: "#c9b6ff", tabungan: "#8fd3ff", kebutuhan: "#ffb86b" };

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
  const [duplicateFromId, setDuplicateFromId] = useState("none");
  const [isEditTabOpen, setIsEditTabOpen] = useState(false);
  const [isDeletePlannerOpen, setIsDeletePlannerOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [editTabTitle, setEditTabTitle] = useState("");
  
  const [itemData, setItemData] = useState({ name: "", amount: "", type: "expense", tag: "" });
  const [payData, setPayData] = useState({ accountId: "", categoryId: "", toAccountId: "" });
  const [payAsTransfer, setPayAsTransfer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCarryOverOpen, setIsCarryOverOpen] = useState(false);
  const [carryOverTitle, setCarryOverTitle] = useState("");

  const activePlanner = initialPlanners.find((p: any) => p.id === activeTab);
  const activeItems = initialItems.filter((i: any) => i.planner_id === activeTab);

  const handleAddTab = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const p = await createPlanner(tabTitle, "", "", duplicateFromId === "none" ? undefined : duplicateFromId);
      setActiveTab(p.id);
      setIsAddTabOpen(false);
      setTabTitle("");
      setDuplicateFromId("none");
    } catch (e) {
      alert("Error adding planner");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteTab = async () => {
    try {
      await deletePlanner(activeTab);
      const remainingPlanners = initialPlanners.filter((p: any) => p.id !== activeTab);
      setActiveTab(remainingPlanners[0]?.id || "new");
      setIsDeletePlannerOpen(false);
    } catch (e) {
      alert("Error deleting planner");
    }
  };

  const handleDeleteTab = () => {
    setIsDeletePlannerOpen(true);
  };

  const handleEditTab = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updatePlanner(activeTab, editTabTitle);
      setIsEditTabOpen(false);
    } catch (e) {
      alert("Error updating planner");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = () => {
    if (!activePlanner) return;
    setEditTabTitle(activePlanner.title);
    setIsEditTabOpen(true);
  };

  const openCarryOverModal = () => {
    if (!activePlanner) return;
    setCarryOverTitle(guessNextMonthTitle(activePlanner.title));
    setIsCarryOverOpen(true);
  };

  const unpaidCount = activeItems.filter(
    (i: any) => !(i.status_tag?.includes("lunas") || i.status_tag?.includes("diterima"))
  ).length;

  const handleCarryOver = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await carryOverUnpaidItems(activeTab, carryOverTitle);
      setActiveTab(result.planner.id);
      setIsCarryOverOpen(false);
    } catch (e: any) {
      alert(e.message || "Gagal melanjutkan ke bulan berikutnya");
    } finally {
      setIsSubmitting(false);
    }
  };

  
  const handleUnrealize = async (item: any) => {
    setIsSubmitting(true);
    try {
      const result = await unrealizePlannerItem(item.id);
      if (!result.deletedTransaction) {
        // Item lama yang dibayar sebelum fitur tautan ada: transaksinya tidak diketahui, jadi tidak bisa dihapus otomatis
        alert("Status lunas dibatalkan, tapi transaksi lamanya tidak ikut terhapus (item ini dibayar sebelum fitur tautan ada). Kalau perlu, hapus manual di halaman Transaksi supaya saldo kembali.");
      }
    } catch(e: any) {
      alert(e?.message || "Gagal membatalkan realisasi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditItemModal = (item: any) => {
    setSelectedItem(item);
    setItemData({
      name: item.name,
      amount: item.amount.toString(),
      type: item.type,
      tag: item.status_tag || ""
    });
    setIsEditItemOpen(true);
  };

  const handleEditItemSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updatePlannerItem(selectedItem.id, itemData.name, Number(itemData.amount));
      setIsEditItemOpen(false);
    } catch(e) {
      alert("Gagal mengupdate item");
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
      await realizePlannerItem(
        selectedItem.id,
        selectedItem.amount,
        selectedItem.type,
        selectedItem.name,
        payData.accountId,
        payData.categoryId,
        payAsTransfer ? payData.toAccountId : undefined
      );
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
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
            <span className="h-3.5 w-3.5 rounded-[5px] border-2 border-ink" style={{ background: GROUP_COLORS[catKey] }} />
            {catName}
          </h2>
          <button
            onClick={() => { setActiveCategory(catKey); setItemData({...itemData, type}); setIsAddItemOpen(true); }}
            className="flex h-8 items-center gap-1 rounded-full border-2.5 border-line bg-card px-3 text-xs font-black shadow-cartoon-sm active:translate-y-px"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={3} /> Tambah
          </button>
        </div>
        <div className="overflow-hidden rounded-cartoon border-3 border-line bg-card shadow-cartoon divide-y-2 divide-dashed divide-divider">
          {items.map((item: any) => {
            const isLunas = item.status_tag?.includes("lunas") || item.status_tag?.includes("diterima");
            return (
              <div key={item.id} className={cn("group flex flex-col justify-center px-4 py-3 transition-colors hover:bg-background", isLunas && "bg-cartoon-lime/10")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-black", isLunas && "line-through opacity-60")}>{item.name}</span>
                    {item.status_tag && (
                      <span className={cn("rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-black text-ink", isLunas ? "bg-cartoon-lime" : "bg-cartoon-pink")}>
                        {item.status_tag}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-sm font-black", isLunas ? "text-muted-foreground line-through" : (item.type === 'expense' ? "text-expense" : "text-income"))}>
                      {item.type === 'expense' ? "-" : "+"}{formatCurrency(item.amount)}
                    </span>
                    {!isLunas ? (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        className="h-8 rounded-xl bg-cartoon-yellow px-2.5 text-xs text-ink" 
                        onClick={() => { setSelectedItem(item); setPayData({ accountId: "", categoryId: "", toAccountId: "" }); setPayAsTransfer(false); setIsPayOpen(true); }}
                      >
                        <CheckSquare className="h-3 w-3 mr-1" /> {item.type === 'expense' ? "Bayar" : "Terima"}
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-8 rounded-xl px-2.5 text-xs font-black text-muted-foreground hover:text-foreground" 
                        onClick={() => handleUnrealize(item)}
                        disabled={isSubmitting}
                      >
                        Batal
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-line bg-background outline-none lg:opacity-0 lg:group-hover:opacity-100" aria-label="Aksi">
                          <MoreVertical className="h-4 w-4" strokeWidth={3} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-line shadow-xl w-36 p-1.5">
                        <DropdownMenuItem onClick={() => openEditItemModal(item)} className="cursor-pointer rounded-lg text-xs">
                          <Edit className="h-3 w-3 mr-2" /> Edit Item
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setItemToDelete(item)} className="cursor-pointer rounded-lg text-xs text-destructive focus:text-destructive focus:bg-destructive/10">
                          <Trash2 className="h-3 w-3 mr-2" /> Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
             <div className="p-4 text-center text-sm text-muted-foreground">Belum ada data</div>
          )}
          <div className="flex items-center justify-between bg-background px-4 py-3">
            <span className="text-sm font-black">Subtotal {catName}</span>
            <span className={cn("text-sm font-black", isExpense ? "text-expense" : "text-income")}>
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
  const doneCount = activeItems.length - unpaidCount;
  const compact = (n: number) =>
    n >= 1_000_000 ? `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt` : formatCurrency(n);
  const breakdown = [
    { key: "wajib", label: "Wajib" },
    { key: "tabungan", label: "Tabungan & Investasi" },
    { key: "kebutuhan", label: "Kebutuhan Pribadi" },
  ].map((g) => {
    const amount = activeItems.filter((i: any) => i.category === g.key).reduce((sum: number, i: any) => sum + Number(i.amount), 0);
    return { ...g, amount, percent: totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0 };
  });

  const openDuplicateModal = () => {
    if (!activePlanner) return;
    setTabTitle(guessNextMonthTitle(activePlanner.title));
    setDuplicateFromId(activeTab);
    setIsAddTabOpen(true);
  };

  return (
    <div className="space-y-5 pb-4">
      <PageHeader title="Rencana Bulanan" description="Proyeksi & realisasi bulanan dalam 1 klik" />

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {initialPlanners.map((p: any) => (
          <button
            key={p.id}
            onClick={() => setActiveTab(p.id)}
            className={cn(
              "h-10 shrink-0 whitespace-nowrap rounded-full border-2.5 border-line px-4 text-sm font-black transition-all",
              activeTab === p.id ? "bg-cartoon-lilac text-ink shadow-cartoon-sm" : "bg-card hover:bg-accent"
            )}
          >
            {p.title}
          </button>
        ))}
        <button onClick={() => { setTabTitle(""); setDuplicateFromId("none"); setIsAddTabOpen(true); }} className="flex h-10 shrink-0 items-center gap-1 rounded-full border-2.5 border-dashed border-line px-4 text-sm font-black hover:bg-accent">
          <Plus className="h-4 w-4" strokeWidth={3} /> Bulan Baru
        </button>
      </div>

      {!activePlanner ? (
        <div className="flex flex-col items-center justify-center rounded-cartoon border-3 border-line bg-card py-14 text-center shadow-cartoon animate-in fade-in">
          <Mascot size={88} mood="worried" className="mb-3 -rotate-6" />
          <h2 className="font-display text-xl font-semibold">Belum ada Rencana</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
            Buat tab bulan baru untuk mulai merencanakan pengeluaran Anda.
          </p>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-5 lg:space-y-0">
          <div className="min-w-0 space-y-6">
          
          {/* Header & Options */}
          <div className="flex items-center justify-between rounded-cartoon border-3 border-line bg-card px-5 py-3.5 shadow-cartoon">
            <h2 className="font-display text-xl font-semibold">Rencana {activePlanner.title}</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" aria-label="Opsi bulan">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-line shadow-xl">
                <DropdownMenuItem onClick={openCarryOverModal} className="cursor-pointer">
                  <ChevronRight className="h-4 w-4 mr-2" /> Lanjutkan ke Bulan Berikutnya
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openEditModal} className="rounded-xl cursor-pointer">
                  <Edit className="h-4 w-4 mr-2" /> Ubah Nama Bulan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteTab} className="rounded-xl cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-2" /> Hapus Bulan Ini
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Summaries (mobile) */}
          <div className="grid grid-cols-3 gap-3 lg:hidden">
            {[
              { label: "Pemasukan", value: formatCurrency(totalIncome), color: "#9be7c4" },
              { label: "Pengeluaran", value: formatCurrency(totalExpense), color: "#ff9ebb" },
              { label: "Sisa proyeksi", value: `${sisa >= 0 ? "+" : ""}${formatCurrency(sisa)}`, color: sisa >= 0 ? "#ffd447" : "#ff5c7a" },
            ].map((card) => (
              <div key={card.label} className="min-w-0 rounded-[22px] border-3 border-line p-3.5 text-ink shadow-cartoon lg:p-5" style={{ background: card.color }}>
                <p className="truncate text-[10px] font-black uppercase tracking-wider lg:text-xs">{card.label}</p>
                <p className="mt-1 break-words font-display text-[15px] font-bold leading-tight sm:text-lg lg:text-[28px]">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 2xl:grid-cols-2">
          {renderGroup("Pemasukan", "income", "income")}
          {renderGroup("Wajib — Prioritas", "wajib", "expense")}
          {renderGroup("Tabungan & Investasi", "tabungan", "expense")}
          {renderGroup("Kebutuhan Pribadi", "kebutuhan", "expense")}
          </div>
          </div>

          {/* Desktop side panel */}
          <aside className="sticky top-6 hidden flex-col gap-4 lg:flex">
            <section className="rounded-cartoon border-3 border-line bg-cartoon-lilac p-5 text-ink shadow-cartoon-lg">
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.08em]">Rencana masuk</p>
                  <p className="mt-1.5 truncate font-display text-[26px] font-bold leading-none">{compact(totalIncome)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.08em]">Rencana keluar</p>
                  <p className="mt-1.5 truncate font-display text-[26px] font-bold leading-none">{compact(totalExpense)}</p>
                </div>
              </div>
              <p className="mt-3 text-[13px] font-extrabold">
                Sisa proyeksi {sisa >= 0 ? "+" : ""}
                {formatCurrency(sisa)}
              </p>
              <div className="mt-3 flex items-center gap-2.5">
                <CartoonBar
                  percent={activeItems.length ? (doneCount / activeItems.length) * 100 : 0}
                  color="#1e1b18"
                  className="h-4 border-ink bg-white"
                />
                <span className="shrink-0 text-[13px] font-black">
                  {doneCount}/{activeItems.length} beres
                </span>
              </div>
            </section>

            <section className="flex flex-col gap-3.5 rounded-cartoon border-3 border-line bg-card p-5 shadow-cartoon">
              <h2 className="font-display text-xl font-semibold">Per jenis</h2>
              {breakdown.map((g) => (
                <div key={g.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm font-black">
                    <span>{g.label}</span>
                    <span>
                      {formatCurrency(g.amount)} · {g.percent}%
                    </span>
                  </div>
                  <CartoonBar percent={g.percent} color={GROUP_COLORS[g.key]} className="h-4" />
                </div>
              ))}
              <p className="text-[13px] font-extrabold text-muted-foreground">
                {sisa >= 0 ? `Sisa tak teralokasi ${formatCurrency(sisa)}` : `Kelebihan rencana ${formatCurrency(-sisa)}`}
              </p>
            </section>

            <Button variant="outline" size="lg" onClick={openDuplicateModal}>
              <Copy className="mr-2 h-4 w-4" strokeWidth={3} /> Duplikat ke bulan baru
            </Button>
            {unpaidCount > 0 && (
              <Button size="lg" className="bg-cartoon-yellow text-ink hover:bg-cartoon-yellow" onClick={openCarryOverModal}>
                Bawa {unpaidCount} item belum beres <ChevronRight className="ml-1 h-4 w-4" strokeWidth={3} />
              </Button>
            )}
          </aside>
          </div>

      {/* MODAL EDIT ITEM */}
      <Dialog open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-cartoon p-6 border-line shadow-2xl">
          <DialogHeader>
            <DialogTitle>Edit Item Rencana</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditItemSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Item</Label>
              <Input required value={itemData.name} onChange={e => setItemData({...itemData, name: e.target.value})} className="rounded-xl h-11 border-line" />
            </div>
            <div className="space-y-2">
              <Label>Jumlah (Rp)</Label>
              <Input type="number" required value={itemData.amount} onChange={e => setItemData({...itemData, amount: e.target.value})} className="rounded-xl h-11 border-line" />
            </div>
            <Button type="submit" className="w-full rounded-full h-11" disabled={isSubmitting}>Simpan Perubahan</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG DELETE PLANNER */}
      <AlertDialog open={isDeletePlannerOpen} onOpenChange={setIsDeletePlannerOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Bulan Ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus bulan ini dan seluruh isinya? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTab} className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus Permanen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

          
        </div>
      )}

      {/* MODAL ADD TAB */}
      <Dialog open={isAddTabOpen} onOpenChange={setIsAddTabOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-cartoon p-6 border-line shadow-2xl">
          <DialogHeader>
            <DialogTitle>Buat Rencana Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTab} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Bulan / Rencana</Label>
              <Input placeholder="Contoh: Oktober 2026" className="rounded-xl h-11 border-line" required value={tabTitle} onChange={e => setTabTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duplikat Item Dari</Label>
              <Select value={duplicateFromId} onValueChange={setDuplicateFromId}>
                <SelectTrigger className="rounded-xl h-11 border-line bg-secondary/20">
                  <SelectValue placeholder="Pilih rencana..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-line">
                  <SelectItem value="none" className="rounded-xl">Mulai Kosong</SelectItem>
                  {initialPlanners.map((p: any) => (
                    <SelectItem key={p.id} value={p.id} className="rounded-xl">{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Item akan disalin, namun status 'Lunas' akan direset.</p>
            </div>
            <Button type="submit" className="w-full rounded-full h-11" disabled={isSubmitting}>Simpan Rencana</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL LANJUTKAN KE BULAN BERIKUTNYA */}
      <Dialog open={isCarryOverOpen} onOpenChange={setIsCarryOverOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-cartoon p-6 border-line shadow-2xl">
          <DialogHeader>
            <DialogTitle>Lanjutkan ke Bulan Berikutnya</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCarryOver} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {unpaidCount > 0
                ? `${unpaidCount} item yang belum lunas akan dibawa ke rencana baru ini. Item yang sudah lunas tidak akan ikut.`
                : "Semua item bulan ini sudah lunas — rencana baru akan dibuat kosong."}
            </p>
            <div className="space-y-2">
              <Label>Nama Bulan Baru</Label>
              <Input
                required
                value={carryOverTitle}
                onChange={(e) => setCarryOverTitle(e.target.value)}
                className="rounded-xl h-11 border-line"
              />
            </div>
            <Button type="submit" className="w-full rounded-full h-11" disabled={isSubmitting}>
              {isSubmitting ? "Memproses..." : "Lanjutkan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL EDIT TAB */}
      <Dialog open={isEditTabOpen} onOpenChange={setIsEditTabOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-cartoon p-6 border-line shadow-2xl">
          <DialogHeader>
            <DialogTitle>Ubah Nama Rencana</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTab} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Bulan / Rencana</Label>
              <Input placeholder="Contoh: Oktober 2026" className="rounded-xl h-11 border-line" required value={editTabTitle} onChange={e => setEditTabTitle(e.target.value)} />
            </div>
            <Button type="submit" className="w-full rounded-full h-11" disabled={isSubmitting}>Simpan Perubahan</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL ADD ITEM */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-cartoon">
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
        <DialogContent className="sm:max-w-[425px] rounded-cartoon">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-foreground" /> Eksekusi Realisasi!
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <form onSubmit={handlePay} className="space-y-4">
              <div className="bg-secondary p-4 rounded-xl space-y-1">
                <p className="text-xs text-muted-foreground">Item yang direalisasikan:</p>
                <p className="font-bold">{selectedItem.name}</p>
                <p className={cn("text-lg font-black", selectedItem.type === 'expense' ? "text-expense" : "text-income")}>
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

              {selectedItem.type === 'expense' && (
                <div className="space-y-2">
                  <Label>Realisasikan Sebagai</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={!payAsTransfer ? "default" : "outline"}
                      className="flex-1 h-9 text-xs"
                      onClick={() => setPayAsTransfer(false)}
                    >
                      Pengeluaran Biasa
                    </Button>
                    <Button
                      type="button"
                      variant={payAsTransfer ? "default" : "outline"}
                      className="flex-1 h-9 text-xs"
                      onClick={() => setPayAsTransfer(true)}
                    >
                      Transfer Antar Akun
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Pilih Transfer kalau ini sebenarnya cuma pindah uang ke akun/dompet lain milikmu sendiri (mis. tarik tunai, top up e-wallet) — bukan pengeluaran sungguhan.
                  </p>
                </div>
              )}

              {payAsTransfer ? (
                <div className="space-y-2">
                  <Label>Ke Akun</Label>
                  <Select required onValueChange={v => setPayData({...payData, toAccountId: v})}>
                    <SelectTrigger><SelectValue placeholder="Pilih Akun Tujuan" /></SelectTrigger>
                    <SelectContent>
                      {accounts.filter((a: any) => a.id !== payData.accountId).map((a:any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Pilih Kategori Transaksi</Label>
                  <Select required onValueChange={v => setPayData({...payData, categoryId: v})}>
                    <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                    <SelectContent>
                      {categories.filter((c:any) => c.type === selectedItem.type).map((c:any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
        <DialogContent className="sm:max-w-[425px] rounded-cartoon">
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
