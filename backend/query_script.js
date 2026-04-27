import { Sequelize, QueryTypes } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
  }
);

async function run() {
  try {
    const query = 'SELECT r.ReservationId, CONCAT(c.FirstName, \" \", c.LastName) AS guest, rt.name AS RoomThemeName, rt.city, rt.showcaseImage FROM Reservation r JOIN Client c ON r.ClientId = c.ClientId JOIN RoomReservation rr ON r.ReservationId = rr.ReservationId JOIN Room rm ON rr.RoomId = rm.RoomId JOIN RoomTheme rt ON rm.RoomThemeId = rt.RoomThemeId';

    const results = await sequelize.query(query, { type: QueryTypes.SELECT });

    console.log('--- Detailed Reservations ---');
    results.forEach(res => {
      console.log('ID: ' + res.ReservationId + ', Guest: ' + res.guest + ', Theme: ' + res.RoomThemeName + ', City: ' + res.city + ', Image: ' + res.showcaseImage);
    });

    const groups = {};
    results.forEach(res => {
      const key = res.city + ' | ' + res.RoomThemeName;
      if (!groups[key]) {
        groups[key] = 0;
      }
      groups[key]++;
    });

    console.log('\n--- Grouped Counts ---');
    for (const key in groups) {
      console.log(key + ': ' + groups[key]);
    }

    const allShanghai = results.length > 0 && results.every(res => res.city === 'Shanghai');
    const firstImage = results.length > 0 ? results[0].showcaseImage : null;
    const allImagesSame = results.length > 0 && results.every(res => res.showcaseImage === firstImage);

    console.log('\nAll Shanghai: ' + allShanghai);
    console.log('All Images Same: ' + allImagesSame);

  } catch (error) {
    console.error('Error executing query:', error);
  } finally {
    await sequelize.close();
  }
}

run();
