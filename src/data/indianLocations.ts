/**
 * Indian locations database for offline autocomplete.
 * Used when REACT_APP_GOOGLE_API_KEY is not set.
 * Format: "Area, City, State"
 */
export interface LocationData {
  area: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  display: string; // full display string
}

const RAW: [string, string, string, number, number][] = [
  // [area, city, state, lat, lng]
  // Punjab
  ["Model Town", "Ludhiana", "Punjab", 30.9000, 75.8573],
  ["Civil Lines", "Ludhiana", "Punjab", 30.9010, 75.8490],
  ["Sarabha Nagar", "Ludhiana", "Punjab", 30.8900, 75.8400],
  ["BRS Nagar", "Ludhiana", "Punjab", 30.8850, 75.8350],
  ["Sector 32", "Chandigarh", "Punjab", 30.7280, 76.7780],
  ["Sector 17", "Chandigarh", "Punjab", 30.7400, 76.7800],
  ["Sector 22", "Chandigarh", "Punjab", 30.7350, 76.7850],
  ["Amritsar Cantonment", "Amritsar", "Punjab", 31.6340, 74.8723],
  ["Lawrence Road", "Amritsar", "Punjab", 31.6400, 74.8600],
  ["Ranjit Avenue", "Amritsar", "Punjab", 31.6500, 74.8700],
  ["Model Town", "Jalandhar", "Punjab", 31.3260, 75.5762],
  ["Guru Nanak Pura", "Jalandhar", "Punjab", 31.3200, 75.5800],
  // Delhi
  ["Connaught Place", "New Delhi", "Delhi", 28.6315, 77.2167],
  ["Karol Bagh", "New Delhi", "Delhi", 28.6514, 77.1907],
  ["Lajpat Nagar", "New Delhi", "Delhi", 28.5677, 77.2433],
  ["Dwarka Sector 10", "New Delhi", "Delhi", 28.5921, 77.0460],
  ["Rohini Sector 3", "New Delhi", "Delhi", 28.7041, 77.1025],
  ["Saket", "New Delhi", "Delhi", 28.5244, 77.2066],
  ["Vasant Kunj", "New Delhi", "Delhi", 28.5200, 77.1600],
  ["Janakpuri", "New Delhi", "Delhi", 28.6219, 77.0878],
  ["Pitampura", "New Delhi", "Delhi", 28.7000, 77.1300],
  ["Mayur Vihar Phase 1", "New Delhi", "Delhi", 28.6080, 77.2950],
  // Maharashtra
  ["Bandra West", "Mumbai", "Maharashtra", 19.0596, 72.8295],
  ["Andheri East", "Mumbai", "Maharashtra", 19.1136, 72.8697],
  ["Powai", "Mumbai", "Maharashtra", 19.1176, 72.9060],
  ["Worli", "Mumbai", "Maharashtra", 19.0176, 72.8562],
  ["Borivali West", "Mumbai", "Maharashtra", 19.2307, 72.8567],
  ["Koregaon Park", "Pune", "Maharashtra", 18.5362, 73.8938],
  ["Kothrud", "Pune", "Maharashtra", 18.5074, 73.8077],
  ["Viman Nagar", "Pune", "Maharashtra", 18.5679, 73.9143],
  ["Hinjewadi", "Pune", "Maharashtra", 18.5912, 73.7389],
  ["Baner", "Pune", "Maharashtra", 18.5590, 73.7868],
  ["Nagpur Civil Lines", "Nagpur", "Maharashtra", 21.1458, 79.0882],
  // Karnataka
  ["Koramangala", "Bengaluru", "Karnataka", 12.9352, 77.6245],
  ["Indiranagar", "Bengaluru", "Karnataka", 12.9784, 77.6408],
  ["Whitefield", "Bengaluru", "Karnataka", 12.9698, 77.7500],
  ["HSR Layout", "Bengaluru", "Karnataka", 12.9116, 77.6389],
  ["Jayanagar", "Bengaluru", "Karnataka", 12.9250, 77.5938],
  ["Electronic City", "Bengaluru", "Karnataka", 12.8399, 77.6770],
  ["Malleshwaram", "Bengaluru", "Karnataka", 13.0035, 77.5710],
  // Tamil Nadu
  ["Anna Nagar", "Chennai", "Tamil Nadu", 13.0850, 80.2101],
  ["T Nagar", "Chennai", "Tamil Nadu", 13.0418, 80.2341],
  ["Adyar", "Chennai", "Tamil Nadu", 13.0012, 80.2565],
  ["Velachery", "Chennai", "Tamil Nadu", 12.9815, 80.2180],
  ["Porur", "Chennai", "Tamil Nadu", 13.0350, 80.1570],
  ["Coimbatore RS Puram", "Coimbatore", "Tamil Nadu", 11.0168, 76.9558],
  // Telangana
  ["Banjara Hills", "Hyderabad", "Telangana", 17.4126, 78.4480],
  ["Jubilee Hills", "Hyderabad", "Telangana", 17.4239, 78.4073],
  ["Gachibowli", "Hyderabad", "Telangana", 17.4401, 78.3489],
  ["Madhapur", "Hyderabad", "Telangana", 17.4478, 78.3915],
  ["Kondapur", "Hyderabad", "Telangana", 17.4600, 78.3600],
  ["Secunderabad", "Hyderabad", "Telangana", 17.4399, 78.4983],
  // Gujarat
  ["Navrangpura", "Ahmedabad", "Gujarat", 23.0395, 72.5603],
  ["Satellite", "Ahmedabad", "Gujarat", 23.0300, 72.5100],
  ["Bodakdev", "Ahmedabad", "Gujarat", 23.0500, 72.5000],
  ["Vastrapur", "Ahmedabad", "Gujarat", 23.0400, 72.5200],
  ["Surat City", "Surat", "Gujarat", 21.1702, 72.8311],
  // Rajasthan
  ["Malviya Nagar", "Jaipur", "Rajasthan", 26.8505, 75.8069],
  ["Vaishali Nagar", "Jaipur", "Rajasthan", 26.9124, 75.7318],
  ["C Scheme", "Jaipur", "Rajasthan", 26.9124, 75.8069],
  ["Mansarovar", "Jaipur", "Rajasthan", 26.8500, 75.7500],
  // Uttar Pradesh
  ["Gomti Nagar", "Lucknow", "Uttar Pradesh", 26.8467, 81.0000],
  ["Hazratganj", "Lucknow", "Uttar Pradesh", 26.8500, 80.9462],
  ["Indira Nagar", "Lucknow", "Uttar Pradesh", 26.8800, 81.0000],
  ["Sector 62", "Noida", "Uttar Pradesh", 28.6270, 77.3650],
  ["Sector 18", "Noida", "Uttar Pradesh", 28.5700, 77.3200],
  ["Varanasi Cantonment", "Varanasi", "Uttar Pradesh", 25.3176, 82.9739],
  // West Bengal
  ["Salt Lake Sector V", "Kolkata", "West Bengal", 22.5726, 88.4312],
  ["Park Street", "Kolkata", "West Bengal", 22.5514, 88.3612],
  ["Ballygunge", "Kolkata", "West Bengal", 22.5200, 88.3700],
  ["New Town", "Kolkata", "West Bengal", 22.5800, 88.4700],
  // Madhya Pradesh
  ["Vijay Nagar", "Indore", "Madhya Pradesh", 22.7196, 75.8577],
  ["Palasia", "Indore", "Madhya Pradesh", 22.7200, 75.8700],
  ["Bhopal New Market", "Bhopal", "Madhya Pradesh", 23.2599, 77.4126],
  // Kerala
  ["Kakkanad", "Kochi", "Kerala", 10.0159, 76.3419],
  ["Edapally", "Kochi", "Kerala", 10.0200, 76.3100],
  ["Thiruvananthapuram Kowdiar", "Thiruvananthapuram", "Kerala", 8.5241, 76.9366],
  // Haryana
  ["DLF Phase 1", "Gurugram", "Haryana", 28.4595, 77.0266],
  ["Sector 14", "Gurugram", "Haryana", 28.4700, 77.0400],
  ["Sector 56", "Gurugram", "Haryana", 28.4200, 77.0900],
  ["Sector 15", "Faridabad", "Haryana", 28.4089, 77.3178],
  // Bihar
  ["Patna Boring Road", "Patna", "Bihar", 25.6093, 85.1376],
  ["Rajendra Nagar", "Patna", "Bihar", 25.6000, 85.1200],
  // Odisha
  ["Bhubaneswar Saheed Nagar", "Bhubaneswar", "Odisha", 20.2961, 85.8245],
  ["Cuttack Badambadi", "Cuttack", "Odisha", 20.4625, 85.8830],
  // Assam
  ["Guwahati Dispur", "Guwahati", "Assam", 26.1445, 91.7362],
  // Jharkhand
  ["Ranchi Harmu", "Ranchi", "Jharkhand", 23.3441, 85.3096],
  // Uttarakhand
  ["Dehradun Rajpur Road", "Dehradun", "Uttarakhand", 30.3165, 78.0322],
];

export const LOCATIONS: LocationData[] = RAW.map(([area, city, state, lat, lng]) => ({
  area, city, state, country: "India", latitude: lat, longitude: lng,
  display: `${area}, ${city}, ${state}`,
}));

export function searchLocations(query: string): LocationData[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return LOCATIONS.filter(l =>
    l.display.toLowerCase().includes(q) ||
    l.area.toLowerCase().includes(q) ||
    l.city.toLowerCase().includes(q) ||
    l.state.toLowerCase().includes(q)
  ).slice(0, 8);
}
