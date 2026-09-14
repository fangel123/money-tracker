const fs = require('fs');
const path = 'src/app/[locale]/(app)/planner/PlannerContent.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add AlertDialog imports and unrealize/update actions
content = content.replace(
  /import \{ Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter \} from \"@\/components\/ui\/dialog\";/,
  `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";\nimport { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";`
);

content = content.replace(
  /import \{ createPlanner, createPlannerItem, realizePlannerItem, deletePlannerItem, updatePlanner, deletePlanner \} from "\.\/actions";/,
  `import { createPlanner, createPlannerItem, realizePlannerItem, unrealizePlannerItem, updatePlannerItem, deletePlannerItem, updatePlanner, deletePlanner } from "./actions";`
);

// 2. Add state for delete planner confirmation, edit item, etc.
content = content.replace(
  /const \[isEditTabOpen, setIsEditTabOpen\] = useState\(false\);/,
  `const [isEditTabOpen, setIsEditTabOpen] = useState(false);\n  const [isDeletePlannerOpen, setIsDeletePlannerOpen] = useState(false);\n  const [isEditItemOpen, setIsEditItemOpen] = useState(false);`
);

// 3. Update handleDeleteTab to just open modal
content = content.replace(
  /const handleDeleteTab = async \(\) => \{\n    if \(\!confirm\(\"Apakah Anda yakin ingin menghapus bulan ini dan semua isinya\?\"\)\) return;\n    try \{\n      await deletePlanner\(activeTab\);\n      const remainingPlanners = initialPlanners\.filter\(\(p: any\) => p\.id \!\=\= activeTab\);\n      setActiveTab\(remainingPlanners\[0\]\?\.id \|\| \"new\"\);\n    \} catch \(e\) \{\n      alert\(\"Error deleting planner\"\);\n    \}\n  \};/,
  `const confirmDeleteTab = async () => {\n    try {\n      await deletePlanner(activeTab);\n      const remainingPlanners = initialPlanners.filter((p: any) => p.id !== activeTab);\n      setActiveTab(remainingPlanners[0]?.id || "new");\n      setIsDeletePlannerOpen(false);\n    } catch (e) {\n      alert("Error deleting planner");\n    }\n  };\n\n  const handleDeleteTab = () => {\n    setIsDeletePlannerOpen(true);\n  };`
);

// 4. Update the trigger for Hapus Bulan
// Already using onClick={handleDeleteTab}, so it will just open the alert dialog now.

// 5. Add functions for Item Actions: unrealize, openEdit, handleEdit
const itemActions = `
  const handleUnrealize = async (item: any) => {
    setIsSubmitting(true);
    try {
      await unrealizePlannerItem(item.id);
    } catch(e) {
      alert("Gagal membatalkan realisasi");
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
`;
content = content.replace(/const handleAddItem = async/g, itemActions + '\n  const handleAddItem = async');

// 6. Update the JSX for items to have a Dropdown Menu instead of just being clickable.
// Currently it maps over items and renders a div.
// Wait, I can't blindly regex replace the JSX for the items because it's complex. 
// Let me write a custom string replacer for the item mapping.

fs.writeFileSync(path, content);
console.log('updated part 1');
