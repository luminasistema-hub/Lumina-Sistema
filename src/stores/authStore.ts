import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../integrations/supabase/client'

export type UserRole = 'membro' | 'lider_ministerio' | 'pastor' | 'admin' | 'financeiro' | 'voluntario' | 'midia_tecnologia' | 'integra' | 'super_admin'

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  churchId: string | null
  churchName?: string
  ministry?: string
  status: 'ativo' | 'pendente' | 'inativo'
  created_at: string
  perfil_completo: boolean;
}

export type { User }

interface AuthState {
  user: User | null
  isLoading: boolean
  currentChurchId: string | null
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string, churchName: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
  checkAuth: () => void
  setCurrentChurchId: (churchId: string | null) => void
  initializeAuthListener: () => void;
}

// Criamos a "trava" fora do store para que ela não seja reativa.
// Sua única função é controlar a execução da função checkAuth.
let isCheckingAuth = false;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      currentChurchId: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            console.error('AuthStore: Supabase signInWithPassword error:', error.message);
            return false;
          }
          if (data.user) {
            console.log('AuthStore: Supabase signInWithPassword successful, user:', data.user.id);
            // checkAuth já tem sua própria trava, então é seguro chamar aqui.
            await get().checkAuth(); 
            return true;
          }
        } catch (err) {
          console.error('AuthStore: Unexpected error during login:', err);
        } finally {
          set({ isLoading: false });
        }
        return false;
      },

      register: async (name: string, email: string, password: string, churchName: string) => {
        console.log('AuthStore: Register method called (should be handled in LoginPage).');
        return { success: false, message: 'O registro é tratado diretamente pelo Supabase.' };
      },

      logout: async () => {
        console.log('AuthStore: Attempting logout.');
        set({ isLoading: true });
        const { error } = await supabase.auth.signOut();
        if (!error) {
          console.log('AuthStore: User logged out successfully.');
          set({ user: null, currentChurchId: null, isLoading: false });
        } else {
          console.error('AuthStore: Error during logout:', error);
          set({ isLoading: false });
        }
      },

      checkAuth: async () => {
        // Se uma verificação já está em andamento, esta nova chamada será ignorada.
        if (isCheckingAuth) {
          console.log('AuthStore: checkAuth call ignored, already in progress.');
          return;
        }

        console.log('AuthStore: checkAuth initiated. Setting isLoading to true.');
        set({ isLoading: true });
        isCheckingAuth = true; // Ativa a trava para bloquear novas chamadas

        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          console.log('AuthStore: getSession result - session:', session, 'error:', error);

          if (error) {
            throw error; // Joga o erro para o bloco catch
          }

          if (session && session.user) {
            console.log('AuthStore: Session found for user ID:', session.user.id);
            
            // Verificar se é um Super Admin
            let { data: superAdminProfile } = await supabase
              .from('super_admins')
              .select('id, nome_completo, email')
              .eq('id', session.user.id)
              .maybeSingle();

            if (superAdminProfile) {
              console.log('AuthStore: User is a Super Admin.');
              set({
                user: {
                  id: session.user.id,
                  name: superAdminProfile.nome_completo,
                  email: session.user.email!,
                  role: 'super_admin',
                  churchId: null,
                  churchName: 'Painel Master',
                  ministry: undefined, // Corrigido para undefined se não aplicável
                  status: 'ativo',
                  created_at: session.user.created_at,
                  perfil_completo: true,
                },
                currentChurchId: null,
              });
              // Não precisa mais do "return" aqui, pois o finally cuidará do resto
            } else {
              // Se não for Super Admin, buscar perfil normal
              console.log('AuthStore: Attempting to fetch profile from "membros" table.');
              let { data: profile, error: profileError } = await supabase
                .from('membros')
                .select(`id, nome_completo, email, funcao, id_igreja, status, created_at, perfil_completo, ministerio_recomendado, igrejas(id, nome)`)
                .eq('id', session.user.id)
                .maybeSingle();
              
              console.log('AuthStore: Profile fetch result - data:', profile, 'error:', profileError);

              if (profileError) throw profileError;
              if (!profile) throw new Error('Perfil de membro não encontrado.');

              console.log('AuthStore: Profile data successfully fetched. perfil_completo:', profile.perfil_completo);

              set({
                user: {
                  id: session.user.id,
                  name: profile.nome_completo,
                  email: session.user.email!,
                  role: profile.funcao as UserRole, // Adicionado um type assertion
                  churchId: profile.id_igreja,
                  churchName: profile.igrejas?.nome || 'Igreja não encontrada',
                  ministry: profile.ministerio_recomendado,
                  status: profile.status as 'ativo' | 'pendente' | 'inativo', // Adicionado um type assertion
                  created_at: profile.created_at,
                  perfil_completo: profile.perfil_completo,
                },
                currentChurchId: profile.id_igreja,
              });
            }
          } else {
            console.log('AuthStore: No authenticated user found in session.');
            set({ user: null, currentChurchId: null });
          }
        } catch (error) {
          console.error('AuthStore: Unexpected error during checkAuth:', error);
          set({ user: null, currentChurchId: null });
        } finally {
          // Este bloco é executado SEMPRE, com ou sem erro, garantindo que o estado seja limpo.
          console.log('AuthStore: checkAuth finished. Releasing lock and setting isLoading to false.');
          isCheckingAuth = false; // Libera a trava
          set({ isLoading: false }); // Finaliza o loading
        }
      },

      setCurrentChurchId: (churchId: string | null) => {
        set({ currentChurchId: churchId });
        console.log('AuthStore: Current church ID set to:', churchId);
      },

      initializeAuthListener: () => {
        // Usando uma propriedade interna do 'get' para evitar múltiplas inicializações
        if (!(get() as any)._authListenerInitialized) {
          console.log('AuthStore: Initializing Supabase auth state listener.');
          supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log('AuthStore: Supabase Auth State Change Event:', event, session?.user?.id);
              // Simplificado para chamar checkAuth na maioria dos eventos positivos
              if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                console.log('AuthStore: Auth event detected, calling checkAuth().');
                await get().checkAuth();
              } else if (event === 'SIGNED_OUT') {
                console.log('AuthStore: SIGNED_OUT event detected, clearing state.');
                set({ user: null, currentChurchId: null, isLoading: false });
              }
            }
          );
          // Marca o listener como inicializado
          set({ _authListenerInitialized: true } as Partial<AuthState>);
        }
      }
    }),
    {
      name: 'connect-vida-auth',
      // Persiste apenas o ID da igreja, o que é uma excelente prática.
      partialize: (state) => ({ currentChurchId: state.currentChurchId }),
    }
  )
)
