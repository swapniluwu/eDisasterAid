import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createIcon = (color) => new L.DivIcon({
  html: `<div style="
    width:24px;height:24px;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);background:${color};
    border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -28],
  className: '',
});

const icons = {
  disaster:  createIcon('#E24B4A'),
  relief:    createIcon('#185FA5'),
  volunteer: createIcon('#1D9E75'),
};

const MapView = ({ disasters = [], reliefCenters = [], height = '300px' }) => {
  const center = disasters.length > 0 && disasters[0]?.coordinates?.lat
    ? [disasters[0].coordinates.lat, disasters[0].coordinates.lng]
    : [20.5937, 78.9629];

  const zoom = disasters.length > 0 && disasters[0]?.coordinates?.lat ? 7 : 4;

  return (
    <div
      className="rounded-2xl overflow-hidden border border-neutral-100 w-full"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {disasters.map((d) =>
          d.coordinates?.lat ? (
            <div key={d._id}>
              <Marker
                position={[d.coordinates.lat, d.coordinates.lng]}
                icon={icons.disaster}
              >
                <Popup>
                  <div style={{ fontSize: 13, minWidth: 160 }}>
                    <p style={{ fontWeight: 600, marginBottom: 2 }}>{d.title}</p>
                    <p style={{ color: '#888', marginBottom: 4 }}>{d.location}</p>
                    <p style={{ fontSize: 11 }}>
                      <span style={{
                        fontWeight: 600,
                        color: d.severity === 'critical' ? '#E24B4A'
                             : d.severity === 'high'     ? '#BA7517' : '#185FA5',
                        textTransform: 'capitalize',
                      }}>
                        {d.severity} severity
                      </span>
                      {' · '}{d.type}
                    </p>
                    <p style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                      {d.totalVictimsRegistered || 0} victims registered
                    </p>
                  </div>
                </Popup>
              </Marker>
              <Circle
                center={[d.coordinates.lat, d.coordinates.lng]}
                radius={
                  d.severity === 'critical' ? 25000
                  : d.severity === 'high'   ? 15000
                  : 8000
                }
                pathOptions={{
                  color:       d.severity === 'critical' ? '#E24B4A' : '#185FA5',
                  fillColor:   d.severity === 'critical' ? '#E24B4A' : '#185FA5',
                  fillOpacity: 0.07,
                  weight:      1.5,
                }}
              />
            </div>
          ) : null
        )}

        {reliefCenters.map((c, i) =>
          c.coordinates?.lat ? (
            <Marker
              key={i}
              position={[c.coordinates.lat, c.coordinates.lng]}
              icon={icons.relief}
            >
              <Popup>
                <div style={{ fontSize: 13 }}>
                  <p style={{ fontWeight: 600 }}>{c.name || 'Relief Center'}</p>
                  <p style={{ color: '#888', fontSize: 11 }}>{c.address}</p>
                </div>
              </Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>
    </div>
  );
};

export default MapView;