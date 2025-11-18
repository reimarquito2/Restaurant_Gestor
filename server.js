const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const authRoutes = require('./routes/authRoutes');
const apiAuthRoutes = require('./routes/apiAuthRoutes');
const customerRoutes = require('./routes/customerRoutes');
const jwt = require('jsonwebtoken');
const menuRoutes = require('./routes/menuRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const orderRoutes = require('./routes/orderRoutes');
const verifyRestaurantToken = require('./middlewares/verifyRestaurantToken');
const setupSwagger = require('./swagger');

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));

app.use(session({
  secret: 'seu-segredo-aqui',
  resave: false,
  saveUninitialized: true
}));

app.use(flash());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('✅ MongoDB Conectado!');
    // Setup Swagger API docs before starting the server
    setupSwagger(app);
    app.listen(3000, () => {
      console.log('Servidor rodando em http://localhost:3000');
    });
  })
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

const verifyAdminToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.redirect('/admin/login');
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err || decoded.role !== 'admin') {
      return res.redirect('/admin/login');
    }
    req.userId = decoded.userId;
    req.role = decoded.role;
    next();
  });
};

app.get('/admin/dashboard', verifyAdminToken, (req, res) => {
  res.render('admin/dashboard', { title: 'Dashboard Admin' });
});

// API Routes
app.use('/api/auth', apiAuthRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/orders', orderRoutes);

// Web Routes
app.use('/admin', authRoutes);
app.use('/user', customerRoutes);
app.use('/restaurant', restaurantRoutes);

app.get('/restaurant/dashboard', verifyRestaurantToken, (req, res) => {
  res.render('admin/dashboard', { title: 'Dashboard Restaurante' });
});

app.get('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true });
  res.redirect('/restaurant/login');
});

app.get('/', (req, res) => {
  res.render('index', { title: 'Plataforma de Restaurantes' });
});

// Setup Swagger API docs
setupSwagger(app);

