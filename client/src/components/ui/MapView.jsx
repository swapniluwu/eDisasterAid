import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored markers
const createIcon = (color) => new L.DivIcon({
  html: `<div style="
    width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -32],
  className: '',
});

const icons = {
  disaster:  createIcon('#E24B4A'),
  relief:    createIcon('#185FA5'),
  volunteer: createIcon('#1D9E75'),
};

const MapView = ({ disasters = [], reliefCenters = [], height = '400px' }) => {
  // Default center: India
  const center = disasters.length > 0 && disasters[0].coordinates?.lat
    ? [disasters[0].coordinates.lat, disasters[0].coordinates.lng]
    : [20.5937, 78.9629];

  return (
    <div className="rounded-2xl overflow-hidden border border-neutral-100" style={{ height }}>
      <MapContainer center={center} zoom={disasters.length > 0 ? 8 : 5}
        style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {disasters.map((d) => d.coordinates?.lat && (
          <div key={d._id}>
            <Marker
              position={[d.coordinates.lat, d.coordinates.lng]}
              icon={icons.disaster}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold text-neutral-900">{d.title}</p>
                  <p className="text-neutral-500">{d.location}</p>
                  <p className="text-xs mt-1">
                    <span className={`font-semibold capitalize
                      ${d.severity === 'critical' ? 'text-red-600' :
                        d.severity === 'high' ? 'text-orange-600' : 'text-blue-600'}`}>
                      {d.severity} severity
                    </span>
                    {' • '}{d.type}
                  </p>
                  <p className="text-xs text-neutral-400">{d.totalVictimsRegistered} victims registered</p>
                </div>
              </Popup>
            </Marker>
            {/* Severity radius circle */}
            <Circle
              center={[d.coordinates.lat, d.coordinates.lng]}
              radius={d.severity === 'critical' ? 30000 : d.severity === 'high' ? 20000 : 10000}
              pathOptions={{
                color: d.severity === 'critical' ? '#E24B4A' : d.severity === 'high' ? '#BA7517' : '#185FA5',
                fillColor: d.severity === 'critical' ? '#E24B4A' : '#185FA5',
                fillOpacity: 0.08,
                weight: 1.5,
              }}
            />
          </div>
        ))}

        {reliefCenters.map((c, i) => c.coordinates?.lat && (
          <Marker key={i}
            position={[c.coordinates.lat, c.coordinates.lng]}
            icon={icons.relief}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{c.name || 'Relief Center'}</p>
                <p className="text-neutral-500 text-xs">{c.address}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
export default MapView;