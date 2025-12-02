
// locationTracker.js: Detects user's current location and identifies nearest dining court.
// NOTE: Realistically, this would rely on browser geolocation or a mobile app.
// Must be configured on React Native (frontend) using react-native-geolocation-service and react-native-permissions

const diningCourts = [
    {name: "Windsor Dining Court", coords: {lat: 40.42678, lon:-86.9210}},
    {name: "Earhart Dining Court", coords: {lat: 40.42566, lon:-86.9250}},
    {name: "Hillenbrand Dining Court", coords: {lat: 40.42665, lon:-86.92672}},
    {name: "Wiley Dining Court", coords: {lat: 40.42852, lon:-86.92079}},
    {name: "Ford Dining Court", coords: {lat: 40.43216, lon:-86.91959}}
];

// Calculates distance in kilometers between two lat/lon coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    // Radius of Earth in km
    const R = 6371;
    // difference in lat/lon
    const dLat = (lat2 - lat1) * Math.PI / 180; 
    const dLon = (lon2 - lon1) * Math.PI / 180;

    // square of half the chord length between the points from formula
    const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

    // angular distance between two points
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // returns linear distance
}

// Function: Identify Nearest Dining Location
function getNearestDiningCourt(userCoords) {
    if (!userCoords || !userCoords.lat || !userCoords.lon) {
        return { error: "Invalid or missing user coordinates." }; // if coordinates not found
        }

        // initialization
        let nearest = null; 
        let shortestDist = Infinity;

        // checks relative distance from each court
        diningCourts.forEach((court) => {
        const dist = calculateDistance(
            userCoords.lat,
            userCoords.lon,
            court.coords.lat,
            court.coords.lon
        );

        // reassigns which court is closest an by how much based on calculations
        if (dist < shortestDist) {
            shortestDist = dist;
            nearest = court;
        }
        });

        // returns court with shortest distance
        // can be updated to included tiered list
        return {
            nearestDiningCourt: nearest.name,
            distanceKm: Number(shortestDist.toFixed(3))
        };
}

// function to be updated based on mobile location
function mockGetUserLocation() {
    // Example: user near Ford
    return { lat: 40.4315, lon: -86.9145 }; 
    // currently uses mock data, can be updated to user ipnut, better functionality on frontend
}

function roundToDecimal(num, decimalPlaces) {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(num * factor) / factor;
}

// prints all dining courts for reference
console.log("Location Tracker module loaded. Available dining courts:");
diningCourts.forEach(dc => console.log(`- ${dc.name}`));

// calls the mock function to print the nearest court
const loc = mockGetUserLocation();
const result = getNearestDiningCourt(loc);
console.log("\nNearest dining court:", result.nearestDiningCourt, `(${result.distanceKm} km away)`, `(${roundToDecimal(result.distanceKm*0.621371, 3)} mi away)`);

// possible function exports for use in main file
module.exports = {
    diningCourts,
    calculateDistance,
    getNearestDiningCourt,
    mockGetUserLocation
};