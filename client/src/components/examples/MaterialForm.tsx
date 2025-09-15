import MaterialForm from '../MaterialForm';

export default function MaterialFormExample() {
  const handleSubmit = (data: any) => {
    console.log('Form submitted with data:', data);
    // Simular sucesso
    alert('Material cadastrado com sucesso!');
  };

  const handleCancel = () => {
    console.log('Form cancelled');
  };

  return (
    <div className="p-4">
      <MaterialForm 
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={false}
      />
    </div>
  );
}