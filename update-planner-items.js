const fs = require('fs');
const path = 'src/app/[locale]/(app)/planner/PlannerContent.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldActions = `                      {!isLunas && (
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
                      </button>`;

const newActions = `                      {!isLunas ? (
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="h-7 text-[10px] px-2 rounded-full font-bold hover:bg-primary hover:text-primary-foreground" 
                          onClick={() => { setSelectedItem(item); setIsPayOpen(true); }}
                        >
                          <CheckSquare className="h-3 w-3 mr-1" /> {item.type === 'expense' ? "Bayar" : "Terima"}
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-7 text-[10px] px-2 rounded-full font-bold text-muted-foreground hover:text-foreground" 
                          onClick={() => handleUnrealize(item)}
                          disabled={isSubmitting}
                        >
                          Batal
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity outline-none">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-border/50 shadow-xl w-36 p-1.5">
                          <DropdownMenuItem onClick={() => openEditItemModal(item)} className="cursor-pointer rounded-lg text-xs">
                            <Edit className="h-3 w-3 mr-2" /> Edit Item
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setItemToDelete(item)} className="cursor-pointer rounded-lg text-xs text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="h-3 w-3 mr-2" /> Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>`;

content = content.replace(oldActions, newActions);

const editItemModal = `
      {/* MODAL EDIT ITEM */}
      <Dialog open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-6 border-border/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Edit Item Rencana</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditItemSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Item</Label>
              <Input required value={itemData.name} onChange={e => setItemData({...itemData, name: e.target.value})} className="rounded-xl h-11 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label>Jumlah (Rp)</Label>
              <Input type="number" required value={itemData.amount} onChange={e => setItemData({...itemData, amount: e.target.value})} className="rounded-xl h-11 border-border/50" />
            </div>
            <Button type="submit" className="w-full rounded-full h-11" disabled={isSubmitting}>Simpan Perubahan</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG DELETE PLANNER */}
      <AlertDialog open={isDeletePlannerOpen} onOpenChange={setIsDeletePlannerOpen}>
        <AlertDialogContent className="rounded-3xl border-border/50 shadow-2xl">
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
`;

content = content.replace(/\{renderGroup\("Kebutuhan Pribadi", "kebutuhan", "expense"\)\}/, `{renderGroup("Kebutuhan Pribadi", "kebutuhan", "expense")}\n${editItemModal}`);

fs.writeFileSync(path, content);
console.log('updated part 2');
