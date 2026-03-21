// import React, { useEffect, useState, useMemo } from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   SafeAreaView,
//   FlatList,
//   ActivityIndicator,
//   Image,
//   ScrollView,
// } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { useNavigation } from '@react-navigation/native';
// import * as ScreenOrientation from 'expo-screen-orientation';

// const AlertHome = () => {
//   ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);

//   const navigation = useNavigation();

//   const [alerts, setAlerts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [errorMsg, setErrorMsg] = useState('');
//   const [expandedMap, setExpandedMap] = useState({});
//   const [imageErrors, setImageErrors] = useState({});
//   const [currentExpanded, setCurrentExpanded] = useState(false);
//   const [polygonData, setPolygonData] = useState({});

//   // FIX: track actual rendered map container size, so we can center the grid correctly (prevents "zoom/crop" feel)
//   const [mapLayout, setMapLayout] = useState({ width: 0, height: 0 });

//   // Asia country filter (common GDACS country names)
//   const ASIA_COUNTRIES = useMemo(
//     () =>
//       new Set([
//         'Afghanistan',
//         'Armenia',
//         'Azerbaijan',
//         'Bahrain',
//         'Bangladesh',
//         'Bhutan',
//         'Brunei Darussalam',
//         'Brunei',
//         'Cambodia',
//         'China',
//         'Cyprus',
//         'Georgia',
//         'India',
//         'Indonesia',
//         'Iran',
//         'Iran, Islamic Republic of',
//         'Iraq',
//         'Israel',
//         'Japan',
//         'Jordan',
//         'Kazakhstan',
//         'Kuwait',
//         'Kyrgyzstan',
//         "Lao People's Democratic Republic",
//         'Laos',
//         'Lebanon',
//         'Malaysia',
//         'Maldives',
//         'Mongolia',
//         'Myanmar',
//         'Burma',
//         'Nepal',
//         'North Korea',
//         "Korea, Democratic People's Republic of",
//         'Oman',
//         'Pakistan',
//         'Palestine',
//         'State of Palestine',
//         'Philippines',
//         'Qatar',
//         'Russian Federation',
//         'Saudi Arabia',
//         'Singapore',
//         'South Korea',
//         'Korea, Republic of',
//         'Sri Lanka',
//         'Syrian Arab Republic',
//         'Syria',
//         'Taiwan',
//         'Tajikistan',
//         'Thailand',
//         'Timor-Leste',
//         'East Timor',
//         'Turkey',
//         'Turkmenistan',
//         'United Arab Emirates',
//         'UAE',
//         'Uzbekistan',
//         'Viet Nam',
//         'Vietnam',
//         'Yemen',
//         'Hong Kong',
//         'Macao',
//         'Macau',
//       ]),
//     []
//   );

//   const normalizeCountry = (c) => String(c || '').trim();

//   const isInAsiaBBox = (lat, lon) => {
//     if (typeof lat !== 'number' || typeof lon !== 'number') return false;
//     // Approx Asia bounding box (simple + inclusive)
//     return lat >= -11 && lat <= 82 && lon >= 25 && lon <= 180;
//   };

//   const computeCentroid = (geometry) => {
//     try {
//       if (!geometry) return { lat: null, lon: null };

//       const { type, coordinates } = geometry;

//       if (type === 'Point' && Array.isArray(coordinates) && coordinates.length >= 2) {
//         const [lon, lat] = coordinates;
//         return {
//           lat: typeof lat === 'number' ? lat : null,
//           lon: typeof lon === 'number' ? lon : null,
//         };
//       }

//       return { lat: null, lon: null };
//     } catch {
//       return { lat: null, lon: null };
//     }
//   };

//   const fetchPolygonGeometry = async (eventtype, eventid, episodeid) => {
//     try {
//       const url = `https://www.gdacs.org/gdacsapi/api/polygons/getgeometry?eventtype=${eventtype}&eventid=${eventid}&episodeid=${episodeid}`;
//       const res = await fetch(url);
//       if (!res.ok) return null;
//       const data = await res.json();
//       return data;
//     } catch {
//       return null;
//     }
//   };

//   const latLonToTile = (lat, lon, zoom) => {
//     const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
//     const y = Math.floor(
//       ((1 -
//         Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) /
//           Math.PI) /
//         2) *
//         Math.pow(2, zoom)
//     );
//     return { x, y, zoom };
//   };

//   const fetchAlerts = async () => {
//     try {
//       setLoading(true);
//       setErrorMsg('');

//       const res = await fetch('https://www.gdacs.org/gdacsapi/api/events/geteventlist/events4app');

//       if (!res.ok) {
//         throw new Error('Failed to fetch GDACS alerts');
//       }

//       const data = await res.json();
//       const features = Array.isArray(data?.features) ? data.features : [];

//       const mapped = features
//         .map((f) => {
//           const p = f?.properties || {};
//           const g = f?.geometry || null;

//           const eventid = p?.eventid ?? p?.eventId ?? '';
//           const eventtype = p?.eventtype ?? p?.eventType ?? '';
//           const episodeid = p?.episodeid ?? p?.episodeId ?? '';
//           const id = `${eventtype}-${eventid}-${episodeid}`;

//           const { lat, lon } = computeCentroid(g);

//           return {
//             id,
//             title: p?.eventname || p?.name || 'GDACS Alert',
//             alertLevel: p?.alertlevel || p?.alertLevel || 'unknown',
//             eventType: eventtype || 'unknown',
//             eventid,
//             episodeid,
//             country: p?.country || p?.countryname || p?.countryName || '',
//             fromDate: p?.fromdate || p?.fromDate || p?.datetime || '',
//             toDate: p?.todate || p?.toDate || '',
//             lat,
//             lon,
//             geometry: g,
//             severityText: p?.severitydata?.severitytext || '',
//           };
//         })
//         .filter((a) => {
//           const c = normalizeCountry(a.country);
//           if (c) return ASIA_COUNTRIES.has(c);
//           return isInAsiaBBox(a.lat, a.lon);
//         })
//         .sort((a, b) => {
//           const da = new Date(a.toDate || a.fromDate || 0).getTime();
//           const db = new Date(b.toDate || b.fromDate || 0).getTime();
//           return db - da;
//         });

//       setAlerts(mapped);

//       // Fetch polygon data for all alerts
//       const polyPromises = mapped.map(async (alert) => {
//         const polyData = await fetchPolygonGeometry(
//           alert.eventType,
//           alert.eventid,
//           alert.episodeid
//         );
//         return { id: alert.id, data: polyData };
//       });

//       const polyResults = await Promise.all(polyPromises);
//       const polyMap = {};
//       polyResults.forEach((pr) => {
//         if (pr.data) {
//           polyMap[pr.id] = pr.data;
//         }
//       });
//       setPolygonData(polyMap);
//     } catch (e) {
//       setErrorMsg(e?.message || 'Something went wrong');
//       setAlerts([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchAlerts();
//   }, []);

//   const currentAlert = useMemo(() => (alerts.length > 0 ? alerts[0] : null), [alerts]);
//   const alertList = useMemo(() => (alerts.length > 1 ? alerts.slice(1) : []), [alerts]);

//   const formatDate = (d) => {
//     if (!d) return '';
//     const dt = new Date(d);
//     if (Number.isNaN(dt.getTime())) return String(d);
//     return dt.toLocaleString();
//   };

//   const formatCoord = (n) => {
//     if (typeof n !== 'number') return '-';
//     return n.toFixed(4);
//   };

//   const toggleExpanded = (id) => {
//     setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));
//   };

//   const toggleCurrentExpanded = () => {
//     setCurrentExpanded((prev) => !prev);
//   };

//   const handleImageError = (id) => {
//     setImageErrors((prev) => ({ ...prev, [id]: true }));
//   };

//   const renderMapForAlert = (alert) => {
//     if (!alert.lat || !alert.lon) return null;

//     const zoom = 6;
//     const centerTile = latLonToTile(alert.lat, alert.lon, zoom);

//     const tileSize = 256;

//     const tiles = [];
//     for (let dx = -1; dx <= 1; dx++) {
//       for (let dy = -1; dy <= 1; dy++) {
//         const x = centerTile.x + dx;
//         const y = centerTile.y + dy;
//         if (x >= 0 && y >= 0) {
//           tiles.push({
//             url: `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`,
//             x: dx,
//             y: dy,
//             key: `${x}-${y}`,
//           });
//         }
//       }
//     }

//     const pixelX = ((alert.lon + 180) / 360) * Math.pow(2, zoom) * tileSize;
//     const pixelY =
//       ((1 -
//         Math.log(Math.tan((alert.lat * Math.PI) / 180) + 1 / Math.cos((alert.lat * Math.PI) / 180)) /
//           Math.PI) /
//         2) *
//       Math.pow(2, zoom) *
//       tileSize;

//     const centerTilePixelX = centerTile.x * tileSize;
//     const centerTilePixelY = centerTile.y * tileSize;

//     const offsetX = pixelX - centerTilePixelX;
//     const offsetY = pixelY - centerTilePixelY;

//     // marker position within the 3x3 grid (0..768)
//     const markerLeft = tileSize + offsetX;
//     const markerTop = tileSize + offsetY;

//     // FIX: center the marker inside the visible mapContainer by shifting the whole grid
//     const containerW = mapLayout.width || 0;
//     const containerH = mapLayout.height || 300;

//     const gridLeft = containerW ? containerW / 2 - markerLeft : -256; // fallback keeps old behavior until layout known
//     const gridTop = containerH ? containerH / 2 - markerTop : -256;

//     return (
//       <View
//         style={styles.mapContainer}
//         onLayout={(e) => {
//           const { width, height } = e.nativeEvent.layout || {};
//           if (
//             typeof width === 'number' &&
//             typeof height === 'number' &&
//             (width !== mapLayout.width || height !== mapLayout.height)
//           ) {
//             setMapLayout({ width, height });
//           }
//         }}
//       >
//         <View style={[styles.mapGrid, { left: gridLeft, top: gridTop }]}>
//           {tiles.map((tile) => (
//             <Image
//               key={tile.key}
//               source={{ uri: tile.url }}
//               style={[
//                 styles.mapTile,
//                 {
//                   left: (tile.x + 1) * tileSize,
//                   top: (tile.y + 1) * tileSize,
//                 },
//               ]}
//               resizeMode="cover"
//             />
//           ))}
//           <View
//             style={[
//               styles.markerContainer,
//               {
//                 left: markerLeft - 15,
//                 top: markerTop - 30,
//               },
//             ]}
//           >
//             <Text style={styles.markerText}>📍</Text>
//           </View>
//         </View>
//       </View>
//     );
//   };

//   const renderAlertItem = ({ item }) => {
//     const expanded = !!expandedMap[item.id];

//     return (
//       <View style={styles.alertRow}>
//         <View style={styles.alertLeft}>
//           <Text style={styles.alertTitle} numberOfLines={2}>
//             {item.title}
//           </Text>

//           <Text style={styles.alertMeta}>
//             {item.eventType} • {String(item.alertLevel).toUpperCase()}
//             {item.country ? ` • ${item.country}` : ''}
//           </Text>

//           <Text style={styles.alertDate} numberOfLines={1}>
//             {formatDate(item.toDate || item.fromDate)}
//           </Text>

//           {expanded && (
//             <View style={styles.alertDetails}>
//               <Text style={styles.alertDetailText}>
//                 Alert level: {String(item.alertLevel).toUpperCase()}
//               </Text>
//               <Text style={styles.alertDetailText}>
//                 Coordinate: {formatCoord(item.lat)}, {formatCoord(item.lon)}
//               </Text>
//               {item.fromDate ? (
//                 <Text style={styles.alertDetailText}>From: {formatDate(item.fromDate)}</Text>
//               ) : null}
//               {item.toDate ? (
//                 <Text style={styles.alertDetailText}>To: {formatDate(item.toDate)}</Text>
//               ) : null}
//               {item.severityText ? (
//                 <Text style={styles.alertDetailText}>Severity: {item.severityText}</Text>
//               ) : null}

//               {renderMapForAlert(item)}
//             </View>
//           )}
//         </View>

//         {/* Toggle button beside the alert list item */}
//         <TouchableOpacity
//           style={styles.toggleBtn}
//           onPress={() => toggleExpanded(item.id)}
//           activeOpacity={0.8}
//         >
//           <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color="#2563EB" />
//         </TouchableOpacity>
//       </View>
//     );
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backButton}>
//           <Ionicons name="arrow-back" size={24} color="#fff" />
//         </TouchableOpacity>

//         <Text style={styles.headerTitle}>Alert home</Text>

//         {/* REFRESH BUTTON (top right) */}
//         <TouchableOpacity onPress={fetchAlerts} style={styles.refreshButton} activeOpacity={0.8}>
//           <Ionicons name="refresh" size={22} color="#fff" />
//         </TouchableOpacity>
//       </View>

//       {/* CONTENT */}
//       <View style={styles.content}>
//         {loading ? (
//           <View style={styles.center}>
//             <ActivityIndicator size="large" color="#2563EB" />
//             <Text style={styles.loadingText}>Loading alerts...</Text>
//           </View>
//         ) : errorMsg ? (
//           <View style={styles.center}>
//             <Text style={styles.errorText}>{errorMsg}</Text>
//           </View>
//         ) : (
//           <>
//             {/* Current alert spot (most top) */}
//             <View style={styles.sectionHeader}>
//               <Text style={styles.sectionTitle}>Current alert</Text>
//             </View>

//             {currentAlert ? (
//               <View style={styles.currentCard}>
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'flex-start',
//                     justifyContent: 'space-between',
//                   }}
//                 >
//                   <Text
//                     style={[styles.currentTitle, { flex: 1, paddingRight: 10 }]}
//                     numberOfLines={2}
//                   >
//                     {currentAlert.title}
//                   </Text>

//                   <TouchableOpacity onPress={toggleCurrentExpanded} style={styles.toggleBtn}>
//                     <Ionicons
//                       name={currentExpanded ? 'chevron-up' : 'chevron-down'}
//                       size={22}
//                       color="#2563EB"
//                     />
//                   </TouchableOpacity>
//                 </View>

//                 <Text style={styles.currentMeta}>
//                   {currentAlert.eventType} • {String(currentAlert.alertLevel).toUpperCase()}
//                   {currentAlert.country ? ` • ${currentAlert.country}` : ''}
//                 </Text>

//                 <Text style={styles.currentDate}>
//                   {formatDate(currentAlert.toDate || currentAlert.fromDate)}
//                 </Text>

//                 {!currentExpanded && (
//                   <>
//                     <Text style={styles.currentDate}>
//                       Coordinate: {formatCoord(currentAlert.lat)}, {formatCoord(currentAlert.lon)}
//                     </Text>

//                     <Text style={styles.currentDate}>
//                       Alert level: {String(currentAlert.alertLevel).toUpperCase()}
//                     </Text>

//                     {currentAlert.severityText ? (
//                       <Text style={styles.currentDate}>Severity: {currentAlert.severityText}</Text>
//                     ) : null}
//                   </>
//                 )}

//                 {currentExpanded && (
//                   <>
//                     <Text style={styles.currentDate}>
//                       Coordinate: {formatCoord(currentAlert.lat)}, {formatCoord(currentAlert.lon)}
//                     </Text>

//                     <Text style={styles.currentDate}>
//                       Alert level: {String(currentAlert.alertLevel).toUpperCase()}
//                     </Text>

//                     {currentAlert.severityText ? (
//                       <Text style={styles.currentDate}>Severity: {currentAlert.severityText}</Text>
//                     ) : null}

//                     {renderMapForAlert(currentAlert)}
//                   </>
//                 )}
//               </View>
//             ) : (
//               <View style={styles.emptyCard}>
//                 <Text style={styles.emptyText}>No alerts found.</Text>
//               </View>
//             )}

//             {/* Rest of alerts list */}
//             <Text style={styles.sectionTitle}>Alert list</Text>

//             <FlatList
//               data={alertList}
//               keyExtractor={(item) => item.id}
//               renderItem={renderAlertItem}
//               contentContainerStyle={styles.listContent}
//               ListEmptyComponent={
//                 <View style={styles.emptyCard}>
//                   <Text style={styles.emptyText}>No more alerts.</Text>
//                 </View>
//               }
//             />
//           </>
//         )}
//       </View>

//       {/* BOTTOM TAB FOOTER */}
//       <View style={styles.bottomFooter}>
//         <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('Home')}>
//           <Ionicons name="home-outline" size={22} color="#9CA3AF" />
//           <Text style={styles.footerText}>Home</Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.footerItem}
//           onPress={() => navigation.navigate('InfoGuideHome')}
//         >
//           <Ionicons name="information-circle-outline" size={22} color="#9CA3AF" />
//           <Text style={styles.footerText}>Info</Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.footerItem}
//           onPress={() => navigation.navigate('AlertHome')}
//         >
//           <Ionicons name="alert-circle-outline" size={22} color="#2563EB" />
//           <Text style={styles.footerTextActive}>Alert</Text>
//         </TouchableOpacity>

//         <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('Status')}>
//           <Ionicons name="stats-chart-outline" size={22} color="#9CA3AF" />
//           <Text style={styles.footerText}>Status</Text>
//         </TouchableOpacity>
//       </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#e5e7eb',
//   },

//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 16,
//     paddingHorizontal: 12,
//     paddingTop: 44,
//     borderBottomWidth: 1,
//     backgroundColor: '#2563eb',
//   },

//   backButton: {
//     paddingRight: 12,
//   },

//   headerTitle: {
//     fontSize: 18,
//     color: '#fff',
//     fontWeight: 'bold',
//     flex: 1,
//   },

//   refreshButton: {
//     paddingLeft: 12,
//     paddingVertical: 4,
//   },

//   content: {
//     flex: 1,
//     paddingHorizontal: 12,
//     paddingTop: 12,
//     paddingBottom: 90,
//   },

//   sectionHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     marginTop: 6,
//     marginBottom: 8,
//   },

//   sectionTitle: {
//     fontSize: 14,
//     fontWeight: '700',
//     color: '#111827',
//     marginTop: 6,
//     marginBottom: 8,
//   },

//   currentCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 12,
//     padding: 12,
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//     marginBottom: 12,
//   },

//   currentTitle: {
//     fontSize: 16,
//     fontWeight: '800',
//     color: '#111827',
//     marginBottom: 6,
//   },

//   currentMeta: {
//     fontSize: 13,
//     color: '#374151',
//     marginBottom: 6,
//   },

//   currentDate: {
//     fontSize: 12,
//     color: '#6B7280',
//     marginTop: 2,
//   },

//   mapContainer: {
//     width: '100%',
//     height: 300,
//     marginTop: 12,
//     marginBottom: 8,
//     borderRadius: 12,
//     overflow: 'hidden',
//     backgroundColor: '#E5E7EB',
//     position: 'relative',
//   },

//   mapGrid: {
//     width: 768,
//     height: 768,
//     position: 'absolute',
//   },

//   mapTile: {
//     width: 256,
//     height: 256,
//     position: 'absolute',
//   },

//   markerContainer: {
//     position: 'absolute',
//   },

//   marker: {
//     width: 30,
//     height: 30,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   markerText: {
//     fontSize: 24,
//   },

//   listContent: {
//     paddingBottom: 16,
//   },

//   alertRow: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     backgroundColor: '#FFFFFF',
//     borderRadius: 12,
//     padding: 12,
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//     marginBottom: 10,
//   },

//   alertLeft: {
//     flex: 1,
//     paddingRight: 10,
//   },

//   alertTitle: {
//     fontSize: 14,
//     fontWeight: '700',
//     color: '#111827',
//     marginBottom: 4,
//   },

//   alertMeta: {
//     fontSize: 12,
//     color: '#374151',
//     marginBottom: 4,
//   },

//   alertDate: {
//     fontSize: 12,
//     color: '#6B7280',
//   },

//   alertDetails: {
//     marginTop: 8,
//     paddingTop: 8,
//     borderTopWidth: 1,
//     borderTopColor: '#E5E7EB',
//   },

//   alertDetailText: {
//     fontSize: 12,
//     color: '#374151',
//     marginBottom: 4,
//   },

//   toggleBtn: {
//     paddingTop: 2,
//     paddingLeft: 6,
//   },

//   center: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingHorizontal: 16,
//   },

//   loadingText: {
//     marginTop: 10,
//     fontSize: 13,
//     color: '#374151',
//   },

//   errorText: {
//     fontSize: 13,
//     color: '#B91C1C',
//     textAlign: 'center',
//   },

//   emptyCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 12,
//     padding: 12,
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//     marginBottom: 12,
//   },

//   emptyText: {
//     fontSize: 13,
//     color: '#6B7280',
//   },

//   bottomFooter: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     paddingVertical: 10,
//     borderTopWidth: 1,
//     borderColor: '#E5E7EB',
//     backgroundColor: '#FFFFFF',
//   },

//   footerItem: {
//     alignItems: 'center',
//     justifyContent: 'center',
//   },

//   footerText: {
//     fontSize: 12,
//     marginTop: 4,
//     color: '#9CA3AF',
//   },

//   footerTextActive: {
//     fontSize: 12,
//     marginTop: 4,
//     color: '#2563EB',
//     fontWeight: '600',
//   },
// });

// export default AlertHome;

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Image,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { WebView } from 'react-native-webview';

const OSMMap = ({
  height = 300,
  markers = [],
  fitBounds = false,
  center = null, // { lat, lon }
  zoom = 5,
  onMarkerPress = null, // (id) => void
  refreshKey = 0,
}) => {
  const safeMarkers = Array.isArray(markers)
    ? markers
        .filter(
          (m) =>
            typeof m?.lat === 'number' &&
            typeof m?.lon === 'number' &&
            Number.isFinite(m.lat) &&
            Number.isFinite(m.lon)
        )
        .map((m) => ({
          id: String(m.id ?? ''),
          lat: m.lat,
          lon: m.lon,
          title: String(m.title ?? ''),
          desc: String(m.desc ?? ''),
        }))
    : [];

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body { height: 100%; margin: 0; padding: 0; }
      #map { height: 100%; width: 100%; }
      .leaflet-container { background: #E5E7EB; }
      .dot-pin {
        width: 14px;
        height: 14px;
        border-radius: 999px;
        background: #EF4444;
        border: 2px solid #FFFFFF;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      }
    </style>
  </head>
  <body>
    <div id="map"></div>

    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>

    <script>
      (function () {
        var markers = ${JSON.stringify(safeMarkers)};
        var fitBounds = ${fitBounds ? 'true' : 'false'};
        var center = ${center ? JSON.stringify(center) : 'null'};
        var zoom = ${Number.isFinite(zoom) ? zoom : 5};

        var map = L.map('map', {
          zoomControl: true,
          attributionControl: false
        });

        // OpenStreetMap tiles ONLY
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        var pinIcon = L.divIcon({
          className: '',
          html: '<div class="dot-pin"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        var latlngs = [];

        for (var i = 0; i < markers.length; i++) {
          var m = markers[i];
          var ll = [m.lat, m.lon];
          latlngs.push(ll);

          var mk = L.marker(ll, { icon: pinIcon }).addTo(map);

          if (m.title || m.desc) {
            var popup = '';
            if (m.title) popup += '<div style="font-weight:700; margin-bottom:4px;">' + m.title + '</div>';
            if (m.desc) popup += '<div style="font-size:12px; color:#374151;">' + m.desc + '</div>';
            mk.bindPopup(popup);
          }

          (function(id){
            mk.on('click', function() {
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: id }));
              }
            });
          })(m.id);
        }

        // Set view
        if (center && typeof center.lat === 'number' && typeof center.lon === 'number') {
          map.setView([center.lat, center.lon], zoom);
        } else if (latlngs.length === 1) {
          map.setView(latlngs[0], zoom);
        } else if (latlngs.length > 1 && fitBounds) {
          map.fitBounds(latlngs, { padding: [20, 20] });
        } else if (latlngs.length > 1) {
          map.setView(latlngs[0], zoom);
        } else {
          map.setView([20, 100], 3);
        }
      })();
    </script>
  </body>
</html>`;

  return (
    <View style={{ width: '100%', height }}>
      <WebView
        key={`osm-${refreshKey}`} // keeps refresh working too
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
        androidLayerType="software" // IMPORTANT: prevents blank WebView after navigation on some Android devices
        onMessage={(event) => {
          if (!onMarkerPress) return;
          try {
            const msg = JSON.parse(event?.nativeEvent?.data || '{}');
            if (msg?.type === 'markerPress' && msg?.id) {
              onMarkerPress(String(msg.id));
            }
          } catch {}
        }}
      />
    </View>
  );
};

const AlertHome = ({ username }) => {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);

  const navigation = useNavigation();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedMap, setExpandedMap] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const [currentExpanded, setCurrentExpanded] = useState(false);
  const [polygonData, setPolygonData] = useState({});
  const [mapLayout, setMapLayout] = useState({ width: 0, height: 0 });
  const [overallMapLayout, setOverallMapLayout] = useState({ width: 0, height: 0 });

  // NEW: force WebView maps to unmount on blur, remount on focus (fix blank map on Android)
  const [showMaps, setShowMaps] = useState(true);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setShowMaps(true);
      setMapRefreshKey((k) => k + 1);
      return () => {
        setShowMaps(false);
      };
    }, [])
  );

  // Asia country filter (common GDACS country names)
  const ASIA_COUNTRIES = useMemo(
    () =>
      new Set([
        'Afghanistan',
        'Armenia',
        'Azerbaijan',
        'Bahrain',
        'Bangladesh',
        'Bhutan',
        'Brunei Darussalam',
        'Brunei',
        'Cambodia',
        'China',
        'Cyprus',
        'Georgia',
        'India',
        'Indonesia',
        'Iran',
        'Iran, Islamic Republic of',
        'Iraq',
        'Israel',
        'Japan',
        'Jordan',
        'Kazakhstan',
        'Kuwait',
        'Kyrgyzstan',
        "Lao People's Democratic Republic",
        'Laos',
        'Lebanon',
        'Malaysia',
        'Maldives',
        'Mongolia',
        'Myanmar',
        'Burma',
        'Nepal',
        'North Korea',
        "Korea, Democratic People's Republic of",
        'Oman',
        'Pakistan',
        'Palestine',
        'State of Palestine',
        'Philippines',
        'Qatar',
        'Russian Federation',
        'Saudi Arabia',
        'Singapore',
        'South Korea',
        'Korea, Republic of',
        'Sri Lanka',
        'Syrian Arab Republic',
        'Syria',
        'Taiwan',
        'Tajikistan',
        'Thailand',
        'Timor-Leste',
        'East Timor',
        'Turkey',
        'Turkmenistan',
        'United Arab Emirates',
        'UAE',
        'Uzbekistan',
        'Viet Nam',
        'Vietnam',
        'Yemen',
        'Hong Kong',
        'Macao',
        'Macau',
      ]),
    []
  );

  const normalizeCountry = (c) => String(c || '').trim();

  const isInAsiaBBox = (lat, lon) => {
    if (typeof lat !== 'number' || typeof lon !== 'number') return false;
    // Approx Asia bounding box
    return lat >= -11 && lat <= 82 && lon >= 25 && lon <= 180;
  };

  const computeCentroid = (geometry) => {
    try {
      if (!geometry) return { lat: null, lon: null };

      const { type, coordinates } = geometry;

      if (
        type === 'Point' &&
        Array.isArray(coordinates) &&
        coordinates.length >= 2
      ) {
        const [lon, lat] = coordinates;
        return {
          lat: typeof lat === 'number' ? lat : null,
          lon: typeof lon === 'number' ? lon : null,
        };
      }

      return { lat: null, lon: null };
    } catch {
      return { lat: null, lon: null };
    }
  };

  const fetchPolygonGeometry = async (eventtype, eventid, episodeid) => {
    try {
      const url = `https://www.gdacs.org/gdacsapi/api/polygons/getgeometry?eventtype=${eventtype}&eventid=${eventid}&episodeid=${episodeid}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    } catch {
      return null;
    }
  };

  const latLonToTile = (lat, lon, zoom) => {
    const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
    const y = Math.floor(
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
        Math.pow(2, zoom)
    );
    return { x, y, zoom };
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const res = await fetch(
        'https://www.gdacs.org/gdacsapi/api/events/geteventlist/events4app'
      );

      if (!res.ok) {
        throw new Error('Failed to fetch GDACS alerts');
      }

      const data = await res.json();
      const features = Array.isArray(data?.features) ? data.features : [];

      const mapped = features
        .map((f) => {
          const p = f?.properties || {};
          const g = f?.geometry || null;

          const eventid = p?.eventid ?? p?.eventId ?? '';
          const eventtype = p?.eventtype ?? p?.eventType ?? '';
          const episodeid = p?.episodeid ?? p?.episodeId ?? '';
          const id = `${eventtype}-${eventid}-${episodeid}`;

          const { lat, lon } = computeCentroid(g);

          return {
            id,
            title: p?.eventname || p?.name || 'GDACS Alert',
            alertLevel: p?.alertlevel || p?.alertLevel || 'unknown',
            eventType: eventtype || 'unknown',
            eventid,
            episodeid,
            country: p?.country || p?.countryname || p?.countryName || '',
            fromDate: p?.fromdate || p?.fromDate || p?.datetime || '',
            toDate: p?.todate || p?.toDate || '',
            lat,
            lon,
            geometry: g,
            severityText: p?.severitydata?.severitytext || '',
          };
        })
        .filter((a) => {
          const c = normalizeCountry(a.country);
          if (c) return ASIA_COUNTRIES.has(c);
          return isInAsiaBBox(a.lat, a.lon);
        })
        .sort((a, b) => {
          const da = new Date(a.toDate || a.fromDate || 0).getTime();
          const db = new Date(b.toDate || b.fromDate || 0).getTime();
          return db - da;
        });

      setAlerts(mapped);

      const polyPromises = mapped.map(async (alert) => {
        const polyData = await fetchPolygonGeometry(
          alert.eventType,
          alert.eventid,
          alert.episodeid
        );
        return { id: alert.id, data: polyData };
      });

      const polyResults = await Promise.all(polyPromises);
      const polyMap = {};
      polyResults.forEach((pr) => {
        if (pr.data) {
          polyMap[pr.id] = pr.data;
        }
      });
      setPolygonData(polyMap);
    } catch (e) {
      setErrorMsg(e?.message || 'Something went wrong');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const currentAlert = useMemo(
    () => (alerts.length > 0 ? alerts[0] : null),
    [alerts]
  );
  const alertList = useMemo(
    () => (alerts.length > 1 ? alerts.slice(1) : []),
    [alerts]
  );

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    return dt.toLocaleString();
  };

  const formatCoord = (n) => {
    if (typeof n !== 'number') return '-';
    return n.toFixed(4);
  };

  const toggleExpanded = (id) => {
    setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCurrentExpanded = () => {
    setCurrentExpanded((prev) => !prev);
  };

  const handleImageError = (id) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  const renderOverallMap = () => {
    const validAlerts = alerts.filter((alert) => alert.lat && alert.lon);
    if (validAlerts.length === 0) return null;

    return (
      <View style={styles.overallMapSection}>
        <Text style={styles.sectionTitle}>All Alerts Map</Text>
        <View style={styles.overallMapContainer}>
          {showMaps ? (
            <OSMMap
              refreshKey={mapRefreshKey}
              height={300}
              fitBounds={true}
              markers={validAlerts.map((a) => ({
                id: a.id,
                lat: a.lat,
                lon: a.lon,
                title: a.title,
                desc: `${a.eventType} • ${String(a.alertLevel).toUpperCase()}`,
              }))}
              onMarkerPress={(alertId) => {
                const selected = validAlerts.find(
                  (a) => String(a.id) === String(alertId)
                );
                if (!selected) return;
                navigation.navigate('AlertChat', {
                  alertId: selected.id,
                  title: selected.title,
                  username: username || '',
                });
              }}
            />
          ) : (
            <View style={{ width: '100%', height: 300, backgroundColor: '#E5E7EB' }} />
          )}
        </View>
      </View>
    );
  };

  const renderMapForAlert = (alert) => {
    if (!alert.lat || !alert.lon) return null;

    return (
      <View style={styles.mapContainer}>
        {showMaps ? (
          <OSMMap
            refreshKey={mapRefreshKey}
            height={300}
            fitBounds={false}
            center={{ lat: alert.lat, lon: alert.lon }}
            zoom={6}
            markers={[
              {
                id: alert.id,
                lat: alert.lat,
                lon: alert.lon,
                title: alert.title,
                desc: `${alert.eventType} • ${String(alert.alertLevel).toUpperCase()}`,
              },
            ]}
          />
        ) : (
          <View style={{ width: '100%', height: 300, backgroundColor: '#E5E7EB' }} />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Alert home</Text>

        <TouchableOpacity
          onPress={fetchAlerts}
          style={styles.refreshButton}
          activeOpacity={0.8}>
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ImageBackground
        source={require('./assets/alertbg.jpg')}
        style={{ flex: 1 }}
        resizeMode="cover">
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Loading alerts...</Text>
            </View>
          ) : errorMsg ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : (
            <>
              {renderOverallMap()}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Current alert</Text>
              </View>

              {currentAlert ? (
                <View style={styles.currentCard}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                    }}>
                    <Text
                      style={[
                        styles.currentTitle,
                        { flex: 1, paddingRight: 10 },
                      ]}
                      numberOfLines={2}>
                      {currentAlert.title}
                    </Text>

                    <TouchableOpacity
                      onPress={toggleCurrentExpanded}
                      style={styles.toggleBtn}>
                      <Ionicons
                        name={currentExpanded ? 'chevron-up' : 'chevron-down'}
                        size={22}
                        color="#2563EB"
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.currentMeta}>
                    {currentAlert.eventType} •{' '}
                    {String(currentAlert.alertLevel).toUpperCase()}
                    {currentAlert.country ? ` • ${currentAlert.country}` : ''}
                  </Text>

                  <Text style={styles.currentDate}>
                    {formatDate(currentAlert.toDate || currentAlert.fromDate)}
                  </Text>

                  <Text style={styles.currentDate}>
                    Coordinate: {formatCoord(currentAlert.lat)},{' '}
                    {formatCoord(currentAlert.lon)}
                  </Text>

                  <Text style={styles.currentDate}>
                    Alert level: {String(currentAlert.alertLevel).toUpperCase()}
                  </Text>

                  {currentAlert.severityText ? (
                    <Text style={styles.currentDate}>
                      Severity: {currentAlert.severityText}
                    </Text>
                  ) : null}

                  {currentExpanded ? renderMapForAlert(currentAlert) : null}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No alerts found.</Text>
                </View>
              )}

              <Text style={styles.sectionTitle}>Alert list</Text>

              {alertList.length > 0 ? (
                alertList.map((item) => {
                  const expanded = !!expandedMap[item.id];
                  return (
                    <View key={item.id} style={styles.alertRow}>
                      <View style={styles.alertLeft}>
                        <Text style={styles.alertTitle} numberOfLines={2}>
                          {item.title}
                        </Text>

                        <Text style={styles.alertMeta}>
                          {item.eventType} •{' '}
                          {String(item.alertLevel).toUpperCase()}
                          {item.country ? ` • ${item.country}` : ''}
                        </Text>

                        <Text style={styles.alertDate} numberOfLines={1}>
                          {formatDate(item.toDate || item.fromDate)}
                        </Text>

                        {expanded && (
                          <View style={styles.alertDetails}>
                            <Text style={styles.alertDetailText}>
                              Alert level:{' '}
                              {String(item.alertLevel).toUpperCase()}
                            </Text>
                            <Text style={styles.alertDetailText}>
                              Coordinate: {formatCoord(item.lat)},{' '}
                              {formatCoord(item.lon)}
                            </Text>
                            {item.fromDate ? (
                              <Text style={styles.alertDetailText}>
                                From: {formatDate(item.fromDate)}
                              </Text>
                            ) : null}
                            {item.toDate ? (
                              <Text style={styles.alertDetailText}>
                                To: {formatDate(item.toDate)}
                              </Text>
                            ) : null}
                            {item.severityText ? (
                              <Text style={styles.alertDetailText}>
                                Severity: {item.severityText}
                              </Text>
                            ) : null}

                            {renderMapForAlert(item)}
                          </View>
                        )}
                      </View>

                      <TouchableOpacity
                        style={styles.toggleBtn}
                        onPress={() => toggleExpanded(item.id)}
                        activeOpacity={0.8}>
                        <Ionicons
                          name={expanded ? 'chevron-up' : 'chevron-down'}
                          size={22}
                          color="#2563EB"
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No more alerts.</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        <View style={styles.bottomFooter}>
          <TouchableOpacity
            style={styles.footerItem}
            onPress={() => navigation.navigate('Home')}>
            <Ionicons name="home-outline" size={22} color="#9CA3AF" />
            <Text style={styles.footerText}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerItem}
            onPress={() => navigation.navigate('InfoGuideHome')}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color="#9CA3AF"
            />
            <Text style={styles.footerText}>Info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerItem}
            onPress={() => navigation.navigate('AlertHome')}>
            <Ionicons name="warning-outline" size={22} color="#2563EB" />
            <Text style={styles.footerTextActive}>Alert</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerItem}
            onPress={() => navigation.navigate('Status')}>
            <Ionicons name="stats-chart-outline" size={22} color="#9CA3AF" />
            <Text style={styles.footerText}>Status</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    paddingTop: 44,
    borderBottomWidth: 1,
    backgroundColor: '#2563eb',
  },

  backButton: {
    paddingRight: 12,
  },

  headerTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    flex: 1,
  },

  refreshButton: {
    paddingLeft: 12,
    paddingVertical: 4,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 90,
  },

  overallMapSection: {
    marginBottom: 16,
  },

  overallMapContainer: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
    marginBottom: 8,
  },

  currentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },

  currentTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },

  currentMeta: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
  },

  currentDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  mapContainer: {
    width: '100%',
    height: 300,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },

  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },

  alertLeft: {
    flex: 1,
    paddingRight: 10,
  },

  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },

  alertMeta: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },

  alertDate: {
    fontSize: 12,
    color: '#6B7280',
  },

  alertDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  alertDetailText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },

  toggleBtn: {
    paddingTop: 2,
    paddingLeft: 6,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    minHeight: 400,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#374151',
  },

  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    textAlign: 'center',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },

  emptyText: {
    fontSize: 13,
    color: '#6B7280',
  },

  bottomFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  footerItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerText: {
    fontSize: 12,
    marginTop: 4,
    color: '#9CA3AF',
  },

  footerTextActive: {
    fontSize: 12,
    marginTop: 4,
    color: '#2563EB',
    fontWeight: '600',
  },
});

export default AlertHome;



