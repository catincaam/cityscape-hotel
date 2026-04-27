import Reservation from './entities/Reservation.js';
(async () => {
    try {
        const res = await Reservation.findAll({
            attributes: ['ReservationId', 'status', 'requestedCheckin', 'requestedCheckout']
        });
        console.log(JSON.stringify(res, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
