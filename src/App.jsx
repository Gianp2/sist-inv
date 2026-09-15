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
import { CuentasCorrientesPage } from './pages/CuentasCorrientes/CuentasCorrientesPage';
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
              gap={8}
              toastOptions={{
                className: 'shadow-lg border rounded-2xl font-sans',
                style: {
                  borderRadius: '16px',
                  background: '#ffffff',
                  color: '#171717',
                  border: '1px solid #e5e7eb',
                  padding: '12px 16px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
                },
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
                <Route
                  path="caja"
                  element={
                    <RoleRoute permission="cash.view">
                      <CajaPage />
                    </RoleRoute>
                  }
                />
                {/* Products & Inventory */}
                <Route
                  path="productos"
                  element={
                    <RoleRoute permission="products.view">
                      <ProductosPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="revision-precios"
                  element={
                    <RoleRoute permission="pricing.manage">
                      <RevisionPreciosPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="stock"
                  element={
                    <RoleRoute permission="stock.view">
                      <StockPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="categorias"
                  element={
                    <RoleRoute permission="categories.view">
                      <CategoriasPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="marcas"
                  element={
                    <RoleRoute permission="brands.view">
                      <MarcasPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="compras"
                  element={
                    <RoleRoute permission="purchases.view">
                      <ComprasPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="cuentas-corrientes"
                  element={
                    <RoleRoute permission="current_accounts.view">
                      <CuentasCorrientesPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="clientes"
                  element={
                    <RoleRoute permission="customers.view">
                      <ClientesPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="proveedores"
                  element={
                    <RoleRoute permission="suppliers.view">
                      <ProveedoresPage />
                    </RoleRoute>
                  }
                />

                {/* Redirects from removed tickets/cart routes to Caja */}
                <Route path="pos" element={<Navigate to="/caja" replace />} />
                <Route path="ventas" element={<Navigate to="/caja" replace />} />

                {/* Admin Management & Dashboard Routes */}
                <Route path="dashboard" element={<DashboardPage />} />
                <Route
                  path="reportes"
                  element={
                    <RoleRoute permission="reports.view">
                      <ReportesPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="usuarios"
                  element={
                    <RoleRoute allowedRoles={[ROLES.ADMIN]}>
                      <UsuariosPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="configuracion"
                  element={
                    <RoleRoute permission="settings.view">
                      <ConfiguracionPage />
                    </RoleRoute>
                  }
                />
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
