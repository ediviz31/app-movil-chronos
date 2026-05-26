/**
 * Script de seed para Chronos
 * Crea usuarios y relatos de prueba
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Publicacion = require('./models/Publicacion');

const usuarios = [
  {
    nombre: 'Keilin Vizcarra',
    usuario: 'keilin',
    correo: 'keilin@chronos.com',
    password: 'chronos123',
    bio: 'Exploradora de historias',
    tema_favorito: 'Civilizaciones',
    interes: 'Civilizaciones antiguas'
  },
  {
    nombre: 'ArqueoRelatos',
    usuario: 'arqueorelatos',
    correo: 'arqueo@chronos.com',
    password: 'chronos123',
    bio: 'Arqueólogo y narrador de historias antiguas',
    tema_favorito: 'Egipto antiguo',
    interes: 'Arqueología'
  },
  {
    nombre: 'Legado Épico',
    usuario: 'legadoepico',
    correo: 'legado@chronos.com',
    password: 'chronos123',
    bio: 'Narrador de epopeyas históricas',
    tema_favorito: 'Roma imperial',
    interes: 'Historia romana'
  },
  {
    nombre: 'Crónica Magna',
    usuario: 'cronicamagna',
    correo: 'cronica@chronos.com',
    password: 'chronos123',
    bio: 'Historiador profesional',
    tema_favorito: 'Medievo',
    interes: 'Edad Media'
  },
  {
    nombre: 'Memoria Viva',
    usuario: 'memoriaviva',
    correo: 'memoria@chronos.com',
    password: 'chronos123',
    bio: 'Custodio de relatos olvidados',
    tema_favorito: 'Leyendas',
    interes: 'Mitología y leyendas'
  },
  {
    nombre: 'Rutas Antiguas',
    usuario: 'rutasantiguas',
    correo: 'rutas@chronos.com',
    password: 'chronos123',
    bio: 'Viajero por la historia',
    tema_favorito: 'Roma imperial',
    interes: 'Imperios antiguos'
  }
];

const relatos = [
  {
    autor: 'memoriaviva',
    titulo: 'La historia no está muerta: solo espera ser contada.',
    categoria: 'Civilizaciones',
    contenido: 'Chronos podría convertirse en una comunidad donde cada usuario comparta fragmentos del pasado con voz propia. Aquí no solo leemos historia: la vivimos a través de los ojos de quienes la sienten cercana. Cada relato es un eco del pasado que resuena en el presente.',
    imagen: 'https://images.unsplash.com/photo-1568736333610-eae6e0ab9206?w=1200&q=80'
  },
  {
    autor: 'rutasantiguas',
    titulo: 'Una moneda puede contar más que un libro.',
    categoria: 'Roma imperial',
    contenido: 'En sus símbolos se esconden victorias, emperadores, dioses y propaganda política. Cada moneda romana es una cápsula del tiempo que revela aspectos íntimos de su época: desde las ambiciones de los gobernantes hasta los miedos del pueblo.',
    imagen: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1200&q=80'
  },
  {
    autor: 'arqueorelatos',
    titulo: 'Los secretos de las pirámides revelados',
    categoria: 'Egipto antiguo',
    contenido: 'Recientes descubrimientos en la Gran Pirámide de Giza han revelado cámaras ocultas que podrían cambiar nuestra comprensión de la civilización egipcia. Los arqueólogos han usado tecnología de muones para escanear su interior sin dañar la estructura.',
    imagen: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=1200&q=80'
  },
  {
    autor: 'cronicamagna',
    titulo: 'Caballeros, monjes y trovadores: el alma medieval',
    categoria: 'Medievo',
    contenido: 'La Edad Media no fue una época oscura como solemos creer. Fue un período de profunda transformación cultural donde nacieron las universidades, se construyeron catedrales majestuosas y se desarrollaron códigos de honor que aún influyen en nuestras sociedades.',
    imagen: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=1200&q=80'
  },
  {
    autor: 'legadoepico',
    titulo: 'César y el Rubicón: la noche que cambió Roma',
    categoria: 'Roma imperial',
    contenido: '"Alea iacta est" - "La suerte está echada". Con estas palabras, Julio César cruzó el Rubicón en el 49 a.C. desafiando al Senado romano. Este acto no solo desencadenó una guerra civil, sino que marcó el principio del fin de la República Romana y el nacimiento del Imperio.',
    imagen: 'https://images.unsplash.com/photo-1552432552-06c0b0a94dda?w=1200&q=80'
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Conectado a MongoDB');

    // Limpiar datos existentes
    await User.deleteMany({});
    await Publicacion.deleteMany({});
    console.log('🗑️  Datos anteriores eliminados');

    // Crear usuarios
    const usuariosCreados = {};
    for (const usuarioData of usuarios) {
      const usuario = new User(usuarioData);
      await usuario.save();
      usuariosCreados[usuarioData.usuario] = usuario;
      console.log(`👤 Usuario creado: ${usuario.nombre} (@${usuario.usuario})`);
    }

    // Crear relatos
    for (const relatoData of relatos) {
      const autor = usuariosCreados[relatoData.autor];
      if (autor) {
        const relato = new Publicacion({
          usuario_id: autor._id,
          titulo: relatoData.titulo,
          categoria: relatoData.categoria,
          contenido: relatoData.contenido,
          imagen: relatoData.imagen
        });
        await relato.save();
        console.log(`📜 Relato creado: "${relato.titulo.substring(0, 50)}..."`);
      }
    }

    console.log('\n✅ Seed completado exitosamente!');
    console.log('\n📋 Credenciales de prueba:');
    console.log('Email: keilin@chronos.com');
    console.log('Password: chronos123');
    console.log('\nTambién: arqueo@, legado@, cronica@, memoria@, rutas@chronos.com');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

seed();
