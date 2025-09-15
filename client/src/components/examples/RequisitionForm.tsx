import RequisitionForm from '../RequisitionForm';

// todo: remove mock data when connecting to real backend
const mockEmployees = [
  { id: '1', name: 'João Silva', email: 'joao@empresa.com' },
  { id: '2', name: 'Maria Santos', email: 'maria@empresa.com' },
  { id: '3', name: 'Carlos Oliveira', email: 'carlos@empresa.com' },
  { id: '4', name: 'Ana Costa', email: 'ana@empresa.com' },
];

const mockMaterials = [
  { id: '1', name: 'Parafuso Phillips M6 x 50mm', code: 'PAR-M6-001', currentStock: 45, unit: 'un' },
  { id: '2', name: 'Chapa de Aço Inox 304', code: 'CHA-INOX-001', currentStock: 0, unit: 'm²' },
  { id: '3', name: 'Tinta Primer Branca', code: 'TIN-PRI-001', currentStock: 25, unit: 'l' },
  { id: '4', name: 'Cabo Flexível 2,5mm²', code: 'CAB-FLE-001', currentStock: 8, unit: 'm' },
];

export default function RequisitionFormExample() {
  const handleSubmit = (data: any) => {
    console.log('Requisition form submitted with data:', data);
    alert('Requisição criada com sucesso!');
  };

  const handleCancel = () => {
    console.log('Requisition form cancelled');
  };

  return (
    <div className="p-4">
      <RequisitionForm 
        employees={mockEmployees}
        materials={mockMaterials}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={false}
      />
    </div>
  );
}