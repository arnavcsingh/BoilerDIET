// install dependencies: npm install react-native-geolocation-service react-native-permissions

import React, { useEffect, useState } from "react";
import { View, Text, Button, PermissionsAndroid, Platform } from "react-native";
import Geolocation from "react-native-geolocation-service";

// Dining court data
const diningCourts = [
    {name: "Windsor Dining Court", coords: {lat: 40.42678, lon:-86.9210}},
    {name: "Earhart Dining Court", coords: {lat: 40.42566, lon:-86.9250}},
    {name: "Hillenbrand Dining Court", coords: {lat: 40.42665, lon:-86.92672}},
    {name: "Wiley Dining Court", coords: {lat: 40.42852, lon:-86.92079}},
    {name: "Ford Dining Court", coords: {lat: 40.43216, lon:-86.91959}}
];

// Calculates distance in kilometers between two lat/lon coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Find nearest dining court
function getNearestDiningCourt(userCoords) {
    if (!userCoords?.lat || !userCoords?.lon) {
        return { error: "Invalid or missing user coordinates." };
    }

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
    return {
        nearestDiningCourt: nearest.name,
        distanceKm: Number(shortestDist.toFixed(3)),
  };
}

function roundToDecimal(num, places) {
    const factor = Math.pow(10, places);
    return Math.round(num * factor) / factor; // rounds to specified decimal places
}

export default function NearestDiningCourt() {
    const [location, setLocation] = useState(null); // user's GPS coordinates
    const [result, setResult] = useState(null); // nearest dining court result

    async function requestLocationPermission() {
        if (Platform.OS === "android") { // Android permission request
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
  }

function getRankedDiningCourts(userCoords) {
    if (!userCoords?.lat || !userCoords?.lon) return []; // return empty array if invalid coords

    return diningCourts
        .map((court) => { // attach distance to each court
            const dist = calculateDistance(
                userCoords.lat,
                userCoords.lon,
                court.coords.lat,
                court.coords.lon
            );

            return { // return court with distance
                name: court.name,
                distanceKm: Number(dist.toFixed(3)),
            };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm); // sort from nearest to farthest
}

  // Get GPS location
  const getUserLocation = async () => {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
            alert("Location permission denied."); // alert if permission denied
            return;
        }

    Geolocation.getCurrentPosition( // get current position
      (pos) => {
        const coords = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
        };
        setLocation(coords);

        const nearest = getNearestDiningCourt(coords); // find nearest dining court
        setResult(nearest);

        const ranked = getRankedDiningCourts(coords); // get ranked list
        setRankedList(ranked);
      },
      (error) => {
        console.log("GPS error:", error);
        alert("Error getting GPS location.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 } // GPS options
    );
  };

  return ( // main UI
    <View style={{ padding: 20, marginTop: 50 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        Nearest Dining Court Finder
      </Text>

      <Button title="Get My Location" onPress={getUserLocation} />

      {location && ( // display user location
        <Text style={{ marginTop: 20 }}>
          Your Location: {location.lat}, {location.lon}
        </Text>
      )}

      {result && ( // display nearest dining court result
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 18 }}>
            Nearest Dining Court: {result.nearestDiningCourt}
          </Text>
          <Text>
            Distance: {result.distanceKm} km (
            {roundToDecimal(result.distanceKm * 0.621371, 3)} mi)
          </Text>
        </View>
      )}
      {rankedList.length > 0 && ( // display ranked dining courts
        <View style={{ marginTop: 30 }}>
            <Text style={{ fontSize: 20, fontWeight: "bold" }}>
                Dining Courts Ranked (Closest → Farthest)
            </Text>

            {rankedList.map((court, index) => (
                <Text key={index} style={{ marginTop: 8 }}>
                    {index + 1}. {court.name} — {court.distanceKm} km (
                    {roundToDecimal(court.distanceKm * 0.621371, 3)} mi)
                </Text>
            ))}
        </View>
      )}
    </View>
  );
}