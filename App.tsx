import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Generator from './pages/Generator';
import ProductDetails from './pages/ProductDetails';
import AdminImport from './pages/AdminImport';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        {/* Rota Interna: Gerador de Etiquetas */}
        <Route path="/" element={<Generator />} />
        
        {/* Rota Interna: Importação de Dados */}
        <Route path="/admin" element={<AdminImport />} />
        
        {/* Rota do Cliente: Visualização via QR Code (Busca por OP) */}
        <Route path="/view/:opNumber" element={<ProductDetails />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;