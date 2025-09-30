import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'; // Importar useLocation
import MainLayout from '../components/layout/MainLayout'
import DashboardHome from '../components/dashboard/DashboardHome'
import PersonalInfo from '../components/personal/PersonalInfo'
import MemberJourney from '../components/personal/MemberJourney'
import VocationalTest from '../components/personal/VocationalTest'
import EventsPage from '../components/spiritual/EventsPage'
import CoursesPage from '../components/spiritual/CoursesPage'
import DevotionalsPage from '../components/spiritual/DevotionalsPage'
import OfferingsPage from '../components/contributions/OfferingsPage'
import KidsPage from '../components/family/KidsPage'
import MemberManagementPage from '../components/management/MemberManagementPage'
import MinistriesPage from '../components/management/MinistriesPage'
import FinancialPanel from '../components/management/FinancialPanel'
import SystemStatus from '../components/admin/SystemStatus'
import SystemSettings from '../components/admin/SystemSettings'
import ProfileCompletionDialog from '../components/personal/ProfileCompletionDialog' // Importar o novo componente
import { useAuthStore } from '../stores/authStore' // Importar useAuthStore

interface DashboardPageProps {
  currentChurchId: string;
}

const DashboardPage = ({ currentChurchId }: DashboardPageProps) => {
  const { user, isLoading } = useAuthStore(); // Obter user e isLoading do authStore
  const location = useLocation(); // Hook para acessar o objeto location
  const [activeModule, setActiveModule] = useState('dashboard')
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  useEffect(() => {
    // Verifica se há um estado de navegação para definir o módulo ativo
    if (location.state && (location.state as any).activeModule) {
      setActiveModule((location.state as any).activeModule);
      // Limpa o estado para evitar que o módulo seja redefinido em futuras navegações
      window.history.replaceState({}, document.title); 
    }
  }, [location.state]);

  useEffect(() => {
    // Exibir o diálogo se o usuário não for super_admin, não estiver carregando e o perfil não estiver completo
    if (!isLoading && user && user.role !== 'super_admin' && !user.perfil_completo) {
      setShowProfileDialog(true);
    } else {
      setShowProfileDialog(false);
    }
  }, [user, isLoading]);

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'personal-info':
        return <PersonalInfo />
      case 'member-journey':
        return <MemberJourney />
      case 'vocational-test':
        return <VocationalTest />
      case 'events':
        return <EventsPage />
      case 'courses':
        return <CoursesPage />
      case 'devotionals':
        return <DevotionalsPage />
      case 'offerings':
        return <OfferingsPage />
      case 'kids':
        return <KidsPage />
      case 'member-management':
        return <MemberManagementPage />
      case 'ministries':
        return <MinistriesPage />
      case 'financial-panel':
        return <FinancialPanel />
      case 'live-streaming':
        return (
          <div className="p-6">
            <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl p-6 text-white mb-6">
              <h1 className="text-3xl font-bold mb-2">Transmissão ao Vivo 📡</h1>
              <p className="text-red-100 text-lg">Sistema de streaming e gestão de mídia</p>
            </div>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚧</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Módulo em Desenvolvimento</h2>
              <p className="text-gray-600 text-lg mb-6">
                Este módulo estará disponível em breve com funcionalidades completas de streaming, 
                gestão de mídia e integração com plataformas de transmissão.
              </p>
              <div className="bg-blue-50 rounded-lg p-6 max-w-2xl mx-auto">
                <h3 className="font-semibold text-blue-900 mb-3">Funcionalidades Planejadas:</h3>
                <ul className="text-blue-800 text-left space-y-2">
                  <li>• Transmissão ao vivo para YouTube, Facebook e outras plataformas</li>
                  <li>• Controle de câmeras e equipamentos remotos</li>
                  <li>• Biblioteca de mídia e arquivos de cultos</li>
                  <li>• Agendamento automático de transmissões</li>
                  <li>• Estatísticas de audiência em tempo real</li>
                </ul>
              </div>
            </div>
          </div>
        )
      case 'site-management':
        return (
          <div className="p-6">
            <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl p-6 text-white mb-6">
              <h1 className="text-3xl font-bold mb-2">Gestão de Site 🌐</h1>
              <p className="text-green-100 text-lg">Administração do site público da igreja</p>
            </div>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏗️</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Módulo em Desenvolvimento</h2>
              <p className="text-gray-600 text-lg mb-6">
                Sistema completo de gestão de conteúdo para o site público da igreja.
              </p>
              <div className="bg-green-50 rounded-lg p-6 max-w-2xl mx-auto">
                <h3 className="font-semibold text-green-900 mb-3">Funcionalidades Planejadas:</h3>
                <ul className="text-green-800 text-left space-y-2">
                  <li>• Editor visual de páginas</li>
                  <li>• Gestão de conteúdo e blog</li>
                  <li>• Calendário público de eventos</li>
                  <li>• Galeria de fotos e vídeos</li>
                  <li>• Sistema de notícias e avisos</li>
                </ul>
              </div>
            </div>
          </div>
        )
      case 'system-settings':
        return <SystemSettings />
      case 'system-status':
        return <SystemStatus />
      case 'dashboard':
      default:
        return <DashboardHome />
    }
  }

  const handleModuleSelect = (moduleId: string) => {
    console.log(`Dashboard: Switching to module ${moduleId}`)
    setActiveModule(moduleId)
    setShowProfileDialog(false); // Fechar o diálogo ao navegar
  }

  return (
    <MainLayout activeModule={activeModule} onModuleSelect={handleModuleSelect}>
      {renderModuleContent()}
      {user && !user.perfil_completo && user.role !== 'super_admin' && (
        <ProfileCompletionDialog
          isOpen={showProfileDialog}
          onClose={() => setShowProfileDialog(false)}
          onNavigateToProfile={() => handleModuleSelect('personal-info')}
        />
      )}
    </MainLayout>
  )
}

export default DashboardPage