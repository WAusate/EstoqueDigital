import MaterialsTable from '../MaterialsTable';

// todo: remove mock data when connecting to real backend
const mockMaterials = [
  {
    id: '1',
    name: 'Parafuso Phillips M6 x 50mm',
    code: 'PAR-M6-001',
    unit: 'un',
    unitPrice: 0.85,
    minimumStock: 100,
    currentStock: 45 // Estoque baixo
  },
  {
    id: '2',
    name: 'Chapa de Aço Inox 304',
    code: 'CHA-INOX-001',
    unit: 'm²',
    unitPrice: 120.50,
    minimumStock: 5,
    currentStock: 0 // Estoque crítico
  },
  {
    id: '3',
    name: 'Tinta Primer Branca',
    code: 'TIN-PRI-001',
    unit: 'l',
    unitPrice: 25.90,
    minimumStock: 10,
    currentStock: 25 // Estoque OK
  },
  {
    id: '4',
    name: 'Solda Eletrodo 2,5mm',
    code: 'SOL-ELE-001',
    unit: 'kg',
    unitPrice: 15.75,
    minimumStock: 20,
    currentStock: 30 // Estoque OK
  },
  {
    id: '5',
    name: 'Cabo Flexível 2,5mm²',
    code: 'CAB-FLE-001',
    unit: 'm',
    unitPrice: 4.20,
    minimumStock: 50,
    currentStock: 8 // Estoque baixo
  }
];

export default function MaterialsTableExample() {
  const handleEdit = (material: any) => {
    console.log('Editing material:', material);
    alert(`Editando material: ${material.name}`);
  };

  const handleDelete = (materialId: string) => {
    console.log('Deleting material:', materialId);
    alert(`Material ${materialId} excluído!`);
  };

  return (
    <div className="p-4">
      <MaterialsTable 
        materials={mockMaterials}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={false}
      />
    </div>
  );
}