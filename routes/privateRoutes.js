const permissionModel = require('../models/permissionModel');
const roleModel = require('../models/roleModel');
const { User, Patient } = require('../models/userModel');
const { logout } = require('../controllers/authController');
const { getIcon } = require('../utils/iconUtils');

const privateRoutes = [
  {
    path: '/dashboard',
    title: 'Dassdsdhboard privado',
    view: 'pages/privatePages/dashboard.njk',
    icon: getIcon('home'), // Utiliza la función para obtener el iconio
    isPublic: false,
    items: async (userRoles) => {
      let items = [];

      if (userRoles.includes('Doctor')) {
        items.push({ title: 'Gestión de Usuarios', link: '/users' });
        items.push({ title: 'Mis Especialidades', link: '/speciality' });
        items.push({ title: 'Mis Horarios de Atención', link: '/schedule' });
        items.push({ title: 'Mis Dispinibilidad', link: '/availability' });
        items.push({ title: 'Mis Citas', link: '/appointment' });
      }

      if (userRoles.includes('Paciente')) {
        items.push({ title: 'Mis Citas', link: '/appointment' });
        items.push({ title: 'Historia Clínica', link: '/historyClinic' });
      }

      if (userRoles.includes('Administrador')) {
        items.push({ title: 'Gestión de Usuarios', link: '/users' });
        items.push({ title: 'Roles y Permisos', link: '/roles' });
      }

      items.push({ title: 'Configuración', link: '/dashboard/configuracion' });

      return items;
    },
  },

  {
    path: '/users',
    title: 'Lista de',
    view: 'pages/privatePages/users.njk',
    isPublic: false,

    icon: getIcon('user'),
    items: async () => [],
    subRoutes: [
      {
        path: '/users/admin',
        title: 'Administradores',
        view: 'pages/privatePages/users/adminUsers.njk',
        roles: ['Administrador'],
        icon: getIcon('user'), // Obtiene el icono
        isPublic: false,
        items: async () => [],
      },
      {
        path: '/users/chiefMedical',
        title: 'Jefes Médicos',
        view: 'pages/privatePages/users/chiefMedicalUsers.njk',
        isPublic: false,
        roles: ['Administrador'],
        icon: getIcon('user'), // Obtiene el icono
        items: async () => [],
      },
      {
        path: '/users/doctor',
        title: 'Médicos',
        isPublic: true,
        view: 'pages/privatePages/users/docUsers.njk',
        roles: ['Administrador'],
        icon: getIcon('user'), // Obtiene el icono
        items: async () => [],
      },
      {
        path: '/users/patient',
        title: 'Pacientes',
        view: 'pages/privatePages/users/patientUsers.njk',
        roles: ['Doctor', 'Administrador'],
        isPublic: false,
        icon: getIcon('user'), // Obtiene el icono
        items: async () => [],
      },
    ],
  },
  {
    path: '/schedule',
    title: 'Horarios de Atención',
    roles: ['Doctor', 'Jefe Médico'],
    icon: getIcon('settings'),
    items: async () => [],
  },
  {
    path: '/disponibility',
    title: 'Disponibilidad',
    roles: ['Doctor'],
    icon: getIcon('availability'),
    items: async () => [],
  },
  {
    path: '/speciality',
    title: 'Especialidad',
    view: 'pages/privatePages/specialty/index.njk',
    isPublic: true,
    icon: getIcon('speciality'),
    items: async () => [],
  },
  {
    path: '/services',
    title: 'Servicio',
    roles: ['Jefe Médico'],
    icon: getIcon('service'),
    items: async () => [],
  },
  {
    path: '/appointment',
    title: 'Citas Médicas',
    roles: ['Paciente', 'Doctor'],
    icon: getIcon('appointment'),
    items: async () => [],
  },
  {
    path: '/prodoucers',
    title: 'Resultados Médicos',
    view: 'pages/privatePages/permissions.njk',
    roles: ['Doctor'],
    icon: getIcon('results'),
    items: async () => [],
  },
  {
    path: '/historyClinic',
    title: 'Historia Clinico',
    roles: ['Paciente'],
    icon: getIcon('history'),
    items: async () => [],
  },
  {
    path: '/permissions',
    title: 'Permisos',
    view: 'pages/privatePages/permission/index.njk',
    // roles: ['Administrador'],

    icon: getIcon('permissions'),
    items: async () => [],
  },
  {
    path: '/profile',
    title: 'Perfil',
    view: 'pages/privatePages/auth/profile.njk',
    icon: getIcon('profile'),
    items: async () => [],
  },
  {
    path: '/roles',
    title: 'Roles',
    view: 'pages/privatePages/role/index.njk',
    roles: ['Administrador', 'Paciente'],
    icon: getIcon('roles'),
    items: async () => [],
  },
  {
    path: '/logout',
    title: 'Abandonar',
    items: async () => [],
    icon: getIcon('logout'),
    handler: logout,
  },
];
const hasAccess = (userRoles, route) => {
  return (
    !route.roles ||
    route.roles.length === 0 ||
    route.roles.some((role) => userRoles.includes(role))
  );
};

const getUserRoles = (req) => req.session.roles || [];
const registerPrivateRoutes = (app) => {
  privateRoutes.forEach((route) => {
    app.use(route.path, (req, res, next) => {
      if (route.isPublic && !req.session.authenticated) {
        return res.redirect('/home');
      }

      const userRoles = getUserRoles(req);
      route.userRoles = userRoles;

      if (!hasAccess(userRoles, route)) {
        return res.status(403).send('Acceso denegado');
      }

      next();
    });

    app.get(route.path, async (req, res) => {
      try {
        if (route.handler) {
          // Verificar si hay un handler para la subruta
          return route.handler(req, res);
        }
        const userRoles = getUserRoles(req);
        const items = await route.items(userRoles);

        const allRoles = await roleModel.find();
        const allUsers = await User.find().populate('roles');

        // Datos del perfil del usuario
        const userProfile = await User.findById(req.session.userId);

        res.render(route.view, {
          title: route.title,
          items: items,
          userRoles: userRoles, // Pasar los roles del usuario a la vista
          allRoles,
          allUsers,
          privateRoutes,
          isAuthenticated: req.session.authenticated,
          username: req.session.name,
          profile: userProfile,
          hasAccess, // Asegúrate de pasar hasAccess aquí
        });
      } catch (error) {
        console.error(`Error al cargar los datos para ${route.path}:`, error);
        res.status(500).send('Error al cargar los datos');
      }
    });

    // Manejo de subrutas
    if (route.subRoutes && route.subRoutes.length > 0) {
      route.subRoutes.forEach((subRoute) => {
        app.use(subRoute.path, (req, res, next) => {
          const userRoles = getUserRoles(req);
          if (subRoute.isPublic && !req.session.authenticated) {
            return res.redirect('/home');
          }
          if (!hasAccess(userRoles, subRoute)) {
            return res.status(403).send('Acceso denegado');
          }
          next();
        });

        app.get(subRoute.path, async (req, res) => {
          try {
            if (subRoute.handler) {
              // Verificar si hay un handler para la subruta
              return subRoute.handler(req, res);
            }
            const subItems = await subRoute.items();
            res.render(subRoute.view, {
              title: subRoute.title,
              items: subItems,
              userRoles: getUserRoles(req), // Pasar los roles del usuario a la vista
              isAuthenticated: req.session.authenticated,
              username: req.session.name,
              privateRoutes,
              hasAccess, // Asegúrate de pasar hasAccess aquí
            });
          } catch (error) {
            console.error(
              `Error al cargar los datos para ${subRoute.path}:`,
              error
            );
            res.status(500).send('Error al cargar los datos');
          }
        });
      });
    }
  });
};

module.exports = registerPrivateRoutes;
