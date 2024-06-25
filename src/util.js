require("dotenv").config();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

async function getLocationFromAddress(ubicacion, ciudad) {
    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
                address: `${ubicacion}`,
                //components: `country:CO|locality:${ciudad}`,
                components: `country:CO`,
                key: process.env.GOOGLE_MAPS_API_KEY
            }
        });

        if (response.data.status === 'OK') {
            // The formatted address is located at response.data.results[0].formatted_address
            //console.log("google results", response.data.results)
            return response.data.results;
        } else {
            //throw new Error(`Geocode error: ${response.data.status}`);
            return null;
        }
    } catch (error) {
        console.error(error);
        return null;
    }
}


async function getCandidateLocations(text, boundingBox) {
    try {

        const sessionToken = uuidv4();

        const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
            params: {
                input: text,
                bounds: boundingBox ? `${boundingBox.southWest.lat},${boundingBox.southWest.lng}|${boundingBox.northEast.lat},${boundingBox.northEast.lng}` : undefined,
                components: 'country:CO',
                sessionToken,
                key: process.env.GOOGLE_MAPS_API_KEY
            }
        });

        if (response.data.status === 'OK') {
            const predictions = response.data.predictions;
            // Utilizamos la API de Geocodificación para obtener las coordenadas de cada ubicación
            const locationsWithCoordinates = await Promise.all(predictions.map(async prediction => {
                const detailsResponse = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
                    params: {
                        placeid: prediction.place_id,
                        sessionToken,
                        key: process.env.GOOGLE_MAPS_API_KEY
                    }
                });

                if (detailsResponse.data.status === 'OK') {
                    return {
                        description: prediction.description,
                        place_id: prediction.place_id,
                        coordinates: detailsResponse.data.result.geometry.location
                    };
                } else {
                    return null;
                }
            }));

            return locationsWithCoordinates.filter(location => location !== null);
        } else {
            return null;
        }
    } catch (error) {
        console.error(error);
        return null;
    }
}



async function getAddressFromLocation(latitude, longitude) {
    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
                latlng: `${latitude},${longitude}`,
                key: process.env.GOOGLE_MAPS_API_KEY
            }
        });

        if (response.data.status === 'OK') {
            // The formatted address is located at response.data.results[0].formatted_address
            //console.log("google results", response.data.results)
            return response.data.results[0].formatted_address;
        } else {
            //throw new Error(`Geocode error: ${response.data.status}`);
            return null;
        }
    } catch (error) {
        console.error(error);
        return null;
    }
}


// Método para calcular la ruta entre dos ubicaciones utilizando el API de Mapbox
async function calculateRoute(startLocation, endLocation) {
    try {
        const accessToken = process.env.MAPBOX_API_KEY;
        const response = await axios.get(`https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${startLocation.lng},${startLocation.lat};${endLocation.lng},${endLocation.lat}`, {
            params: {
                access_token: accessToken
            }
        });

        if (response.data.code === 'Ok') {
            return response.data.routes;
        } else {
            return null;
        }
    } catch (error) {
        console.error(error);
        return null;
    }
}



let isHoliday;
let isNight;

const MINIMUM_FARE = 5500;
const FLAG_FALL_FARE = 3400;
const DISTANCE_RATE = 67;
const DISTANCE_FACTOR = 80;
const TIME_RATE = 60;
const TIME_FACTOR = 50;
const NIGHT_SURCHARGE = 800;
const HOLIDAY_SURCHARGE = 800;
const SERVICE_SURCHARGE = 0;

async function calculateCost(distance, waitingTime, isFinal = false) {
    if (isHoliday === undefined) {
        await getHolidays().then(result => {
            isHoliday = result;
        }).catch(error => {
            isHoliday = false;
            console.log('Ocurrió un error al consultar los días festivos:', error);
        });
    }

    let currentTime = new Date();
    let currentHour = currentTime.getHours();

    // Si la hora actual está entre las 20:00 y las 23:59 o entre las 00:00 y las 04:59, entonces hay recargo nocturno
    if (currentHour >= 20 || currentHour < 5) {
        isNight = true;
    } else {
        isNight = false;
    }

    // Calculate the cost of the distance travelled.
    const distanceCost = (distance / DISTANCE_FACTOR) * DISTANCE_RATE;

    // Calculate the cost of waiting time.
    const timeCost = (waitingTime / TIME_FACTOR) * TIME_RATE;

    // Calculate surcharges.
    const surcharge = (isNight ? NIGHT_SURCHARGE : (isHoliday ? HOLIDAY_SURCHARGE : 0));

    // Calculate the total cost.
    let totalCost = FLAG_FALL_FARE + distanceCost + timeCost;

    // If the total cost is less than the minimum fare, use the minimum fare.
    if (isFinal && totalCost < MINIMUM_FARE) {
        totalCost = MINIMUM_FARE;
    }

    totalCost += surcharge + SERVICE_SURCHARGE

    // Round down to the nearest multiple of 100
    totalCost = Math.floor(totalCost / 100) * 100;

    return totalCost;
}


const getHolidays = async () => {
    try {
        // Obtenemos la fecha actual
        let today = new Date();
        // Si hoy es domingo, retornamos verdadero
        if (today.getDay() === 0) {
            //console.log('Hoy es domingo');
            return true;
        }

        // Si no es domingo, formateamos la fecha en formato ISO (YYYY-MM-DD)
        let dd = String(today.getDate()).padStart(2, '0');
        let mm = String(today.getMonth() + 1).padStart(2, '0'); // Los meses van de 0 a 11, así que añadimos 1
        let yyyy = today.getFullYear();
        let todayStr = yyyy + '-' + mm + '-' + dd;

        // Hacemos la petición a la API
        let response = await fetch('https://date.nager.at/api/v3/PublicHolidays/2023/CO');
        let data = await response.json();

        // Verificamos si hoy es un día festivo
        let isHoliday = data.some(holiday => holiday.date === todayStr);
        return isHoliday;
    } catch (error) {
        console.log('Error:', error);
        return false; // Lanza el error para que pueda ser capturado por quien llama a esta función
    }
}






module.exports = {
    getLocationFromAddress,
    getAddressFromLocation,
    getCandidateLocations,
    calculateRoute,
    calculateCost,
}; 