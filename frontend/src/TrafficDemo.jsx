import React, { useCallback, useEffect, useRef, useState } from 'react';
import './traffic-demo.css';

const initialTraffic = {
  phase: 'greenA',
  occupied: { a: false, b: false },
  carProgress: { a: null, b: null },
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-traffic-src="${src}"]`);
    if (existing?.dataset.loaded === 'true') return resolve();
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.dataset.trafficSrc = src;
    script.onload = () => { script.dataset.loaded = 'true'; resolve(); };
    script.onerror = () => reject(new Error('No se pudo cargar el modelo 3D.'));
    document.body.appendChild(script);
  });
}

function ThreeIntersection({ snapshot }) {
  const hostRef = useRef(null);

  useEffect(() => {
    let active = true;
    const start = async () => {
      try {
        await loadScript('/vendor/three.min.js');
        if (!active) return;
        await loadScript(`/traffic-3d.js?instance=${Date.now()}`);
        if (active) window.trafficScene?.sync(snapshot);
      } catch (error) {
        if (hostRef.current) hostRef.current.innerHTML = `<div class="scene-error"><strong>La maqueta 3D no está disponible.</strong><span>${error.message}</span></div>`;
      }
    };
    start();
    return () => {
      active = false;
      window.trafficScene?.destroy?.();
      if (hostRef.current) hostRef.current.replaceChildren();
      delete window.trafficScene;
    };
  }, []);

  useEffect(() => { window.trafficScene?.sync(snapshot); }, [snapshot]);

  return <div className="demo-stage" aria-label="Maqueta tridimensional interactiva de la intersección">
    <div id="threeCanvas" ref={hostRef}/>
    <div className="demo-hint">Arrastra para girar · usa la rueda para acercar</div>
    <button id="resetCamera" className="demo-reset" type="button">Vista inicial</button>
    <div className="demo-legend"><span><i className="red"/>Rojo</span><span><i className="yellow"/>Amarillo</span><span><i className="green"/>Verde</span></div>
  </div>;
}

function DemoMap({ traffic }) {
  const color = (lane) => traffic.phase === 'allRed' || traffic.phase === `yellow${lane.toUpperCase()}`
    ? (traffic.phase === 'allRed' ? '#e25f53' : '#eab94f')
    : traffic.phase === `green${lane.toUpperCase()}` ? '#5b9b68' : '#e25f53';

  return <svg className="demo-road-map" viewBox="0 0 360 170" role="img" aria-label="Esquema de las vías y vehículos simulados">
    <rect width="360" height="170" rx="9" fill="#f3f6f2"/><rect x="0" y="56" width="360" height="58" fill="#66716e"/><rect x="142" y="0" width="76" height="170" fill="#66716e"/>
    <path d="M0 84H360M180 0V170" stroke="#e7d58a" strokeWidth="2" strokeDasharray="11 9" opacity=".8"/>
    <g opacity=".95" fill="#fff"><rect x="126" y="58" width="5" height="22"/><rect x="134" y="58" width="5" height="22"/><rect x="221" y="91" width="5" height="21"/><rect x="229" y="91" width="5" height="21"/><rect x="145" y="35" width="21" height="5"/><rect x="145" y="43" width="21" height="5"/><rect x="194" y="122" width="21" height="5"/><rect x="194" y="130" width="21" height="5"/></g>
    <text x="15" y="24" fill="#415149" fontSize="11" fontWeight="700">VÍA A →</text><text x="236" y="154" fill="#415149" fontSize="11" fontWeight="700">VÍA B ↑</text>
    <circle cx="75" cy="44" r="9" fill={color('a')} stroke="#fff" strokeWidth="2"/><circle cx="238" cy="144" r="9" fill={color('b')} stroke="#fff" strokeWidth="2"/>
    {traffic.occupied.a && <g transform="translate(88 73)"><rect width="30" height="18" rx="5" fill="#d65e50" stroke="#fff" strokeWidth="1.5"/><rect x="7" y="3" width="16" height="6" rx="2" fill="#fff2e7"/><circle cx="7" cy="18" r="3" fill="#293231"/><circle cx="23" cy="18" r="3" fill="#293231"/></g>}
    {traffic.occupied.b && <g transform="translate(171 136) rotate(-90)"><rect width="30" height="18" rx="5" fill="#d65e50" stroke="#fff" strokeWidth="1.5"/><rect x="7" y="3" width="16" height="6" rx="2" fill="#fff2e7"/><circle cx="7" cy="18" r="3" fill="#293231"/><circle cx="23" cy="18" r="3" fill="#293231"/></g>}
    <text x="14" y="151" fill="#64716a" fontSize="9">Sensor HC-SR04 A</text><text x="233" y="25" fill="#64716a" fontSize="9">Sensor HC-SR04 B</text>
  </svg>;
}

export default function TrafficDemo() {
  const [traffic, setTraffic] = useState(initialTraffic);
  const trafficRef = useRef(traffic);
  const transitionRef = useRef([]);
  const busyRef = useRef(false);
  const movingRef = useRef({ a: false, b: false });

  useEffect(() => { trafficRef.current = traffic; window.trafficScene?.sync(traffic); }, [traffic]);
  useEffect(() => () => transitionRef.current.forEach(clearTimeout), []);

  const setPhase = useCallback((phase) => {
    setTraffic((current) => ({ ...current, phase }));
  }, []);

  const startCar = useCallback((lane) => {
    if (movingRef.current[lane]) return;
    movingRef.current[lane] = true;
    setTraffic((current) => ({ ...current, occupied: { ...current.occupied, [lane]: false }, carProgress: { ...current.carProgress, [lane]: 0 } }));
    const startedAt = performance.now();
    const duration = 2600;
    const animate = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      window.trafficScene?.sync({ ...trafficRef.current, carProgress: { ...trafficRef.current.carProgress, [lane]: progress } });
      if (progress < 1) requestAnimationFrame(animate);
      else {
        movingRef.current[lane] = false;
        setTraffic((current) => ({ ...current, carProgress: { ...current.carProgress, [lane]: null } }));
      }
    };
    requestAnimationFrame(animate);
  }, []);

  const reconcile = useCallback(() => {
    if (busyRef.current) return;
    const current = trafficRef.current;
    const target = current.phase === 'greenA' && !current.occupied.a && current.occupied.b && !movingRef.current.a
      ? 'B'
      : current.phase === 'greenB' && !current.occupied.b && current.occupied.a && !movingRef.current.b ? 'A' : null;
    if (!target) return;
    const currentLane = target === 'B' ? 'A' : 'B';
    busyRef.current = true;
    setPhase(`yellow${currentLane}`);
    transitionRef.current.push(setTimeout(() => {
      setPhase('allRed');
      transitionRef.current.push(setTimeout(() => {
        setPhase(`green${target}`);
        busyRef.current = false;
      }, 650));
    }, 1000));
  }, [setPhase]);

  useEffect(() => {
    const current = traffic;
    const greenLane = current.phase === 'greenA' ? 'a' : current.phase === 'greenB' ? 'b' : null;
    if (greenLane && current.occupied[greenLane] && !movingRef.current[greenLane]) {
      const timer = setTimeout(() => startCar(greenLane), 450);
      return () => clearTimeout(timer);
    }
    reconcile();
  }, [traffic.phase, traffic.occupied.a, traffic.occupied.b, startCar, reconcile, traffic]);

  const toggleVehicle = (lane) => {
    if (trafficRef.current.carProgress[lane] !== null) return;
    setTraffic((current) => ({ ...current, occupied: { ...current.occupied, [lane]: !current.occupied[lane] } }));
  };

  const phaseLabel = traffic.phase === 'allRed' ? 'Pausa de seguridad' : traffic.phase.startsWith('yellow') ? 'Cambio a amarillo' : `Vía ${traffic.phase === 'greenA' ? 'A' : 'B'} en verde`;
  const laneNote = (lane) => traffic.occupied[lane]
    ? (traffic.phase === `green${lane.toUpperCase()}` ? 'Vehículo detectado · avanzando' : 'Vehículo esperando · en cola')
    : traffic.phase === `green${lane.toUpperCase()}` ? 'Vía libre · luz verde' : 'Vía libre · en espera';

  return <section className="traffic-demo">
    <div className="demo-intro"><div><p className="eyebrow">Proyecto de semáforos inteligentes</p><h2>Intersección a escala, control local y monitoreo.</h2><p>Maqueta del prototipo con Arduino UNO, dos sensores HC-SR04 y dos grupos de luces. Agrega vehículos para observar el cambio automático de turno.</p></div><span className="demo-badge"><i/> DEMOSTRACIÓN</span></div>
    <div className="demo-layout">
      <article className="demo-scene-card"><div className="demo-card-head"><div><strong>Maqueta 3D interactiva</strong><small>Autos, semáforos, sensores y placa de control</small></div><span>HARDWARE DEL PROTOTIPO</span></div><ThreeIntersection snapshot={traffic}/><div className="demo-scene-foot"><span>HC-SR04 · Arduino UNO · LED + resistencias</span><small>Arrastra el modelo para girar la vista</small></div></article>
      <aside className="demo-side">
        <section className="demo-side-card"><div className="demo-card-kicker">Simulación del control inteligente</div><div className="demo-status-head"><strong>Estado del cruce</strong><span className={traffic.phase.startsWith('yellow') || traffic.phase === 'allRed' ? 'warning' : ''}>{phaseLabel}</span></div>
          {['a','b'].map((lane) => <div className="demo-signal-row" key={lane}><div><b>Semáforo {lane.toUpperCase()} · vía {lane === 'a' ? 'principal' : 'secundaria'}</b><small>{laneNote(lane)}</small></div><div className="demo-lamps">{['red','yellow','green'].map((color) => <i key={color} className={`${color} ${((color === 'red' && (traffic.phase === 'allRed' || (traffic.phase !== `green${lane.toUpperCase()}` && traffic.phase !== `yellow${lane.toUpperCase()}`))) || (color === 'yellow' && traffic.phase === `yellow${lane.toUpperCase()}`) || (color === 'green' && traffic.phase === `green${lane.toUpperCase()}`)) ? 'on' : ''}`}/>)}</div></div>)}
          <div className="demo-vehicle-controls">{['a','b'].map((lane)=><button key={lane} type="button" className={traffic.occupied[lane]?'active':''} aria-pressed={traffic.occupied[lane]} onClick={()=>toggleVehicle(lane)}>{traffic.occupied[lane]?'− Quitar vehículo':'＋ Vehículo'} · vía {lane.toUpperCase()}</button>)}</div>
          <DemoMap traffic={traffic}/><p className="demo-logic"><b>Lógica:</b> {traffic.occupied.a && traffic.occupied.b ? 'Hay vehículos en ambas vías; se atiende primero la vía que tiene verde.' : traffic.occupied.a || traffic.occupied.b ? 'Si la vía verde queda libre y hay un vehículo esperando, el sistema cambia de turno.' : 'Sin vehículos detectados; se conserva el turno actual.'} El cambio pasa por amarillo y una pausa con ambos semáforos en rojo.</p>
          <div className="demo-distance"><span>Distancia simulada · A / B</span><b>{traffic.occupied.a?'18':'42'} / {traffic.occupied.b?'23':'42'} cm</b></div>
        </section>
        <section className="demo-side-card"><div className="demo-card-kicker">Componentes representados</div><div className="demo-components"><div><b>UNO</b><span><strong>Arduino UNO</strong><small>Lectura y control local</small></span><em>× 1</em></div><div><b>◉◉</b><span><strong>HC-SR04</strong><small>Sensores ultrasónicos</small></span><em>× 2</em></div><div><b>●</b><span><strong>LED rojo, amarillo y verde</strong><small>Con resistencia por LED</small></span><em>× 6</em></div></div></section>
      </aside>
    </div>
    <p className="demo-disclaimer">Los vehículos de esta vista son simulados en el navegador; no envían mediciones al Arduino ni accionan hardware real.</p>
  </section>;
}
