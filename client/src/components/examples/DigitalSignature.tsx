import DigitalSignature from '../DigitalSignature';

// todo: remove mock data when connecting to real backend
const mockRequisition = {
  id: '1',
  employeeName: 'João Silva',
  materialName: 'Parafuso Phillips M6 x 50mm',
  materialCode: 'PAR-M6-001',
  quantity: 50,
  unit: 'un',
  observation: 'Material necessário para montagem do equipamento de produção linha 3',
  createdAt: new Date().toISOString(),
  status: 'PENDENTE' as const,
};

const mockSignedRequisition = {
  ...mockRequisition,
  id: '2',
  status: 'ASSINADA' as const,
};

export default function DigitalSignatureExample() {
  const handleSign = (password: string) => {
    console.log('Signing requisition with password verification:', password);
    alert('Requisição assinada com sucesso! Material liberado para retirada.');
  };

  return (
    <div className="p-4 space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Requisição Pendente</h3>
        <DigitalSignature 
          requisition={mockRequisition}
          onSign={handleSign}
          isLoading={false}
        />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Requisição Já Assinada</h3>
        <DigitalSignature 
          requisition={mockSignedRequisition}
          onSign={handleSign}
          isLoading={false}
        />
      </div>
    </div>
  );
}