const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

app.use('/api', require('./src/routes/magazaRoutes'));
app.use('/api/analiz', require('./src/routes/analizRoutes'));
app.use('/api/rakip', require('./src/routes/rakipRoutes'));
app.use('/api/planogram', require('./src/routes/planogramRoutes'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
  console.log(`Tarayıcıdan http://localhost:${PORT} adresine gidebilirsiniz`);
});
