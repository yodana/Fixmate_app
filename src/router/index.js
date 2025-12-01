import { createRouter, createWebHistory } from 'vue-router';
import LoginForm from '../components/LoginForm.vue';
import RegisterForm from '../components/RegisterForm.vue';
import Dashboard from '../components/Dashboard.vue';
import AddAppartement from '../components/AddAppartement.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  
  routes: [
    {
      path: '/',
      name: 'home',
      redirect: '/dashboard' // Redirige l'accueil vers le tableau de bord
    },
    {
      path: '/login',
      name: 'login',
      component: LoginForm
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterForm
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: Dashboard,
      // Vous pourriez vouloir ajouter un méta-champ pour sécuriser cette route:
      // meta: { requiresAuth: true }
    },
    {
      path: '/add-apartment',
      name: 'add-apartment',
      component: AddAppartement,
      // Vous pourriez vouloir ajouter un méta-champ pour sécuriser cette route:
      // meta: { requiresAuth: true }
    },
  ]
});

// --------------------------------------------------------------------
// GARDE DE NAVIGATION GLOBALE
// --------------------------------------------------------------------
router.beforeEach((to, from, next) => {
  // 1. Vérifie si le jeton d'authentification est présent
  const isAuthenticated = !!localStorage.getItem('userToken');

  // 2. Définir les routes d'authentification
  const authRoutes = ['/login', '/register',];

  // 3. Logique de redirection
  
  // Si l'utilisateur est connecté ET qu'il essaie d'aller sur /login ou /register
  if (isAuthenticated && authRoutes.includes(to.path)) {
    // Rediriger vers le tableau de bord
    next('/dashboard');
    
  // Optionnel : Si l'utilisateur N'EST PAS connecté et essaie d'accéder à une page protégée
  // (Pour l'instant, nous ne protégeons que l'accès aux pages Auth, donc cette partie est commentée)
  /*
  } else if (!isAuthenticated && to.meta.requiresAuth) {
    // Rediriger vers la page de connexion
    next('/login');
  */
  
  // Sinon, permettre la navigation
  } else {
    next();
  }
});


export default router;