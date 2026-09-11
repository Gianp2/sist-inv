import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Context Providers
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CashProvider } from './context/CashContext';

// Layout & Guards
import { MainLayout } from './layouts/MainLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleRoute } from './routes/RoleRoute';
import { ROLES } from './constants/roles';

// Pages
import { LoginPage } from './pages/Login/LoginPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { ProductosPage } from './pages/Productos/ProductosPage';
import { StockPage } from './pages/Productos/StockPage';
import RevisionPreciosPage from './pages/RevisionPrecios/RevisionPreciosPage';
import { CategoriasPage } from './pages/Categorias/CategoriasPage';
import { MarcasPage } from './pages/Marcas/MarcasPage';
import { ComprasPage } from './pages/Compras/ComprasPage';
import { CajaPage } from './pages/Caja/CajaPage';
import { ClientesPage } from './pages/Clientes/ClientesPage';
import { ProveedoresPage } from './pages/Proveedores/ProveedoresPage';
import { ReportesPage } from './pages/Reportes/ReportesPage';
import { UsuariosPage } from './pages/Usuarios/UsuariosPage';
import { ConfiguracionPage } from './pages/Configuracion/ConfiguracionPage';
import { NotFoundPage } from './pages/NotFound/NotFoundPage';

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <CashProvider>
            <Router>
            <Toaster
              position="top-right"
              richColors
              closeButton
              theme="light"
              toastOptions={{
                style: { borderRadius: '14px', background: '#ffffff', color: '#171717', border: '1px solid #e5e7eb' },
              }}
            />
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Application Routes with Layout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="caja" element={<CajaPage />} />
                <Route path="productos" element={<ProductosPage />} />
                <Route path="revision-precios" element={<RevisionPreciosPage />} />
                <Route path="stock" element={<StockPage />} />
                <Route path="categorias" element={<CategoriasPage />} />
                <Route path="marcas" element={<MarcasPage />} />
                <Route path="compras" element={<ComprasPage />} />
                <Route path="clientes" element={<ClientesPage />} />
                <Route path="proveedores" element={<ProveedoresPage />} />

                {/* Redirects from removed tickets/cart routes to Caja */}
                <Route path="pos" element={<Navigate to="/caja" replace />} />
                <Route path="ventas" element={<Navigate to="/caja" replace />} />

                {/* Admin Management Routes */}
                <Route path="dashboard" element={<Navigate to="/" replace />} />
                <Route path="reportes" element={<ReportesPage />} />
                <Route path="usuarios" element={<Navigate to="/" replace />} />
                <Route path="configuracion" element={<ConfiguracionPage />} />
              </Route>

              {/* 404 Catch All */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Router>
        </CashProvider>
      </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
