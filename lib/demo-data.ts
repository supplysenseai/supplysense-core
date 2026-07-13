import type { InventoryRow } from "./types";
import type { InventoryItem } from "./inventory-parser";
import { analyzeInventoryItems } from "./inventory-analyzer";
import { resolvePolicy } from "./policy";

export const DEMO_ANALYSIS_DATE = "2026-06-30T12:00:00.000Z";
const TODAY = new Date(DEMO_ANALYSIS_DATE);
const daysAgo = (n: number) => new Date(TODAY.getTime() - n * 86_400_000);

function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function seededInt(seed: number, min: number, max: number): number {
  return min + Math.floor(seededUnit(seed) * (max - min + 1));
}

function seededPrice(seed: number, min: number, max: number): number {
  return parseFloat((min + seededUnit(seed) * (max - min)).toFixed(2));
}

// 200-SKU manufacturing demo dataset covering all 7 business scenarios:
// 1. Critical stockouts   2. Dead stock    3. Slow movers
// 4. Overstock            5. Class A items 6. Class B items  7. Class C items
const RAW_ROWS: InventoryRow[] = [
  // ── SCENARIO 1: CRITICAL STOCKOUT (10 SKUs) ─────────────────────────────
  { sku_id: "SKU-10068", product_name: "Fuse 16A Fast Blow", category: "Electrical", units_on_hand: 43, unit_cost: 12.60, unit_price: 24.99, units_sold_30d: 126, units_sold_90d: 380, last_sale_date: daysAgo(1), lead_time_days: 35, supplier_name: "ElectroSupply Co" },
  { sku_id: "SKU-10071", product_name: "Bearing 6205-2RS", category: "Bearings", units_on_hand: 18, unit_cost: 8.45, unit_price: 16.90, units_sold_30d: 84, units_sold_90d: 252, last_sale_date: daysAgo(1), lead_time_days: 21, supplier_name: "GlobalBearing Inc" },
  { sku_id: "SKU-10082", product_name: "O-Ring Seal 50mm", category: "Seals & Gaskets", units_on_hand: 95, unit_cost: 1.20, unit_price: 2.50, units_sold_30d: 300, units_sold_90d: 900, last_sale_date: daysAgo(1), lead_time_days: 14, supplier_name: "SealMaster LLC" },
  { sku_id: "SKU-10091", product_name: "Hydraulic Fluid ISO46", category: "Fluids", units_on_hand: 22, unit_cost: 45.00, unit_price: 89.00, units_sold_30d: 60, units_sold_90d: 178, last_sale_date: daysAgo(2), lead_time_days: 18, supplier_name: "PetroBase Supply" },
  { sku_id: "SKU-10103", product_name: "Drive Belt B-54", category: "Drive Components", units_on_hand: 8, unit_cost: 22.00, unit_price: 44.50, units_sold_30d: 42, units_sold_90d: 124, last_sale_date: daysAgo(1), lead_time_days: 28, supplier_name: "PowerDrive Corp" },
  { sku_id: "SKU-10112", product_name: "Relay 24VDC SPDT", category: "Electrical", units_on_hand: 31, unit_cost: 18.75, unit_price: 38.00, units_sold_30d: 96, units_sold_90d: 290, last_sale_date: daysAgo(1), lead_time_days: 22, supplier_name: "ElectroSupply Co" },
  { sku_id: "SKU-10119", product_name: "Filter Element P-Series", category: "Filtration", units_on_hand: 14, unit_cost: 32.00, unit_price: 65.00, units_sold_30d: 56, units_sold_90d: 168, last_sale_date: daysAgo(2), lead_time_days: 19, supplier_name: "FilterPro Inc" },
  { sku_id: "SKU-10126", product_name: "Chain Link ANSI 50", category: "Drive Components", units_on_hand: 65, unit_cost: 3.80, unit_price: 7.60, units_sold_30d: 210, units_sold_90d: 632, last_sale_date: daysAgo(1), lead_time_days: 16, supplier_name: "PowerDrive Corp" },
  { sku_id: "SKU-10133", product_name: "Pressure Gauge 0-100psi", category: "Instrumentation", units_on_hand: 7, unit_cost: 28.50, unit_price: 57.00, units_sold_30d: 28, units_sold_90d: 84, last_sale_date: daysAgo(3), lead_time_days: 24, supplier_name: "MeasureTech Ltd" },
  { sku_id: "SKU-10140", product_name: "Solenoid Valve 1/2\"", category: "Pneumatics", units_on_hand: 12, unit_cost: 65.00, unit_price: 130.00, units_sold_30d: 38, units_sold_90d: 114, last_sale_date: daysAgo(1), lead_time_days: 30, supplier_name: "PneumaticParts USA" },

  // ── SCENARIO 2: DEAD STOCK (15 SKUs) ─────────────────────────────────────
  { sku_id: "SKU-20001", product_name: "Gear Oil ISO220 5L", category: "Lubricants", units_on_hand: 180, unit_cost: 38.50, unit_price: 72.00, units_sold_30d: 0, units_sold_90d: 0, last_sale_date: daysAgo(196), lead_time_days: 14, supplier_name: "LubeChem Inc" },
  { sku_id: "SKU-20002", product_name: "Shaft Coupling 25mm", category: "Drive Components", units_on_hand: 42, unit_cost: 85.00, unit_price: 160.00, units_sold_30d: 0, units_sold_90d: 0, last_sale_date: daysAgo(220), lead_time_days: 21, supplier_name: "CouplingTech" },
  { sku_id: "SKU-20003", product_name: "Conveyor Belt 4\" Wide", category: "Conveyors", units_on_hand: 15, unit_cost: 210.00, unit_price: 390.00, units_sold_30d: 0, units_sold_90d: 0, last_sale_date: daysAgo(245), lead_time_days: 35, supplier_name: "ConveyorWorld" },
  { sku_id: "SKU-20004", product_name: "Sensor Proximity 12mm", category: "Sensors", units_on_hand: 67, unit_cost: 44.00, unit_price: 85.00, units_sold_30d: 0, units_sold_90d: 0, last_sale_date: daysAgo(188), lead_time_days: 18, supplier_name: "SensorTech GmbH" },
  { sku_id: "SKU-20005", product_name: "Grease Cartridge EP2", category: "Lubricants", units_on_hand: 240, unit_cost: 6.50, unit_price: 13.00, units_sold_30d: 0, units_sold_90d: 0, last_sale_date: daysAgo(210), lead_time_days: 7, supplier_name: "LubeChem Inc" },
  { sku_id: "SKU-20006", product_name: "Motor Brush Set 90V", category: "Electrical", units_on_hand: 28, unit_cost: 32.00, unit_price: 62.00, units_sold_30d: 0, units_sold_90d: 0, last_sale_date: daysAgo(302), lead_time_days: 45, supplier_name: "MotorParts Direct" },
  { sku_id: "SKU-20007", product_name: "Pipe Nipple 2\" NPT", category: "Plumbing", units_on_hand: 85, unit_cost: 4.20, unit_price: 8.50, units_sold_30d: 0, units_sold_90d: 0, last_sale_date: daysAgo(195), lead_time_days: 10, supplier_name: "PlumbingPlus Co" },
  { sku_id: "SKU-20008", product_name: "Bolt M12x50 Grade 8.8", category: "Fasteners", units_on_hand: 1200, unit_cost: 0.85, unit_price: 1.80, units_sold_30d: 0, units_sold_90d: 0, last_sale_date: daysAgo(184), lead_time_days: 5, supplier_name: "FastenAll Inc" },
  { sku_id: "SKU-20009", product_name: "PLC Module Input 16ch", category: "Automation", units_on_hand: 5, unit_cost: 480.00, unit_price: 920.00, units_sold_30d: 0, units_sold_90d: 0, last_sale_date: daysAgo(265), lead_time_days: 60, supplier_name: "AutoControl Systems" },
  { sku_id: "SKU-20010", product_name: "Weld Wire ER70S-6 10lb", category: "Welding", units_on_hand: 32, unit_cost: 28.00, unit_price: 54.00, units_sold_30d: 0, units_sold_90d: 0, last_sale_date: daysAgo(192), lead_time_days: 12, supplier_name: "WeldMaster Supply" },
  { sku_id: "SKU-20011", product_name: "Rubber Grommet 25mm", category: "Seals & Gaskets", units_on_hand: 560, unit_cost: 0.45, unit_price: 0.95, units_sold_30d: 0, units_sold_90d: 0, last_sale_date: daysAgo(198), lead_time_days: 8, supplier_name: "SealMaster LLC" },
  { sku_id: "SKU-20012", product_name: "Spring Compression 60mm", category: "Springs", units_on_hand: 88, unit_cost: 3.20, unit_price: 6.50, units_sold_30d: 0, units_sold_90d: 0, last_sale_date: daysAgo(215), lead_time_days: 14, supplier_name: "SpringTech USA" },
  { sku_id: "SKU-20013", product_name: "Actuator Linear 150mm", category: "Automation", units_on_hand: 9, unit_cost: 225.00, unit_price: 440.00, units_sold_30d: 0, units_sold_90d: 0, last_sale_date: daysAgo(280), lead_time_days: 28, supplier_name: "AutoControl Systems" },
  { sku_id: "SKU-20014", product_name: "Valve Ball 3/4\" SS", category: "Plumbing", units_on_hand: 38, unit_cost: 18.00, unit_price: 36.00, units_sold_30d: 0, units_sold_90d: 0, last_sale_date: daysAgo(190), lead_time_days: 10, supplier_name: "PlumbingPlus Co" },
  { sku_id: "SKU-20015", product_name: "Insulation Sheet 10mm", category: "Materials", units_on_hand: 24, unit_cost: 42.00, unit_price: 80.00, units_sold_30d: 0, units_sold_90d: 0, last_sale_date: daysAgo(205), lead_time_days: 20, supplier_name: "MaterialsWorld" },

  // ── SCENARIO 3: SLOW MOVERS (20 SKUs) ────────────────────────────────────
  { sku_id: "SKU-30001", product_name: "Lubricant Spray CRC 5-56", category: "Lubricants", units_on_hand: 428, unit_cost: 8.20, unit_price: 16.50, units_sold_30d: 36, units_sold_90d: 114, last_sale_date: daysAgo(2), lead_time_days: 7, supplier_name: "LubeChem Inc" },
  { sku_id: "SKU-30002", product_name: "Coupling Jaw 40mm", category: "Drive Components", units_on_hand: 156, unit_cost: 28.00, unit_price: 55.00, units_sold_30d: 8, units_sold_90d: 64, last_sale_date: daysAgo(5), lead_time_days: 18, supplier_name: "CouplingTech" },
  { sku_id: "SKU-30003", product_name: "Flange Bearing UCFL 207", category: "Bearings", units_on_hand: 88, unit_cost: 24.50, unit_price: 48.00, units_sold_30d: 6, units_sold_90d: 48, last_sale_date: daysAgo(4), lead_time_days: 14, supplier_name: "GlobalBearing Inc" },
  { sku_id: "SKU-30004", product_name: "Tap M10x1.5 HSS", category: "Tooling", units_on_hand: 74, unit_cost: 12.80, unit_price: 25.50, units_sold_30d: 4, units_sold_90d: 32, last_sale_date: daysAgo(6), lead_time_days: 10, supplier_name: "ToolMaster Inc" },
  { sku_id: "SKU-30005", product_name: "Wire Rope 6mm 7x7", category: "Rigging", units_on_hand: 320, unit_cost: 2.40, unit_price: 4.80, units_sold_30d: 18, units_sold_90d: 144, last_sale_date: daysAgo(3), lead_time_days: 12, supplier_name: "RigCraft Supply" },
  { sku_id: "SKU-30006", product_name: "Motor Capacitor 40uF", category: "Electrical", units_on_hand: 110, unit_cost: 14.00, unit_price: 28.00, units_sold_30d: 5, units_sold_90d: 40, last_sale_date: daysAgo(7), lead_time_days: 16, supplier_name: "ElectroSupply Co" },
  { sku_id: "SKU-30007", product_name: "Paint Aerosol RAL 7035", category: "Finishing", units_on_hand: 96, unit_cost: 7.50, unit_price: 15.00, units_sold_30d: 4, units_sold_90d: 32, last_sale_date: daysAgo(8), lead_time_days: 8, supplier_name: "PaintDepot LLC" },
  { sku_id: "SKU-30008", product_name: "Roller Chain 08B-1", category: "Drive Components", units_on_hand: 185, unit_cost: 18.50, unit_price: 37.00, units_sold_30d: 12, units_sold_90d: 96, last_sale_date: daysAgo(4), lead_time_days: 14, supplier_name: "PowerDrive Corp" },
  { sku_id: "SKU-30009", product_name: "Stud Bolt M16x100", category: "Fasteners", units_on_hand: 680, unit_cost: 1.85, unit_price: 3.70, units_sold_30d: 24, units_sold_90d: 192, last_sale_date: daysAgo(2), lead_time_days: 7, supplier_name: "FastenAll Inc" },
  { sku_id: "SKU-30010", product_name: "Cable Duct 40x40", category: "Electrical", units_on_hand: 245, unit_cost: 5.60, unit_price: 11.20, units_sold_30d: 10, units_sold_90d: 80, last_sale_date: daysAgo(6), lead_time_days: 10, supplier_name: "ElectroSupply Co" },
  { sku_id: "SKU-30011", product_name: "Elbow 90° 1\" Galvanized", category: "Plumbing", units_on_hand: 144, unit_cost: 3.80, unit_price: 7.60, units_sold_30d: 6, units_sold_90d: 48, last_sale_date: daysAgo(5), lead_time_days: 8, supplier_name: "PlumbingPlus Co" },
  { sku_id: "SKU-30012", product_name: "Drill Bit Set 19pc HSS", category: "Tooling", units_on_hand: 48, unit_cost: 35.00, unit_price: 68.00, units_sold_30d: 2, units_sold_90d: 18, last_sale_date: daysAgo(9), lead_time_days: 12, supplier_name: "ToolMaster Inc" },
  { sku_id: "SKU-30013", product_name: "Hex Key Set Metric 9pc", category: "Tooling", units_on_hand: 82, unit_cost: 12.00, unit_price: 24.00, units_sold_30d: 4, units_sold_90d: 32, last_sale_date: daysAgo(7), lead_time_days: 10, supplier_name: "ToolMaster Inc" },
  { sku_id: "SKU-30014", product_name: "Pipe Wrench 18\" Aluminum", category: "Hand Tools", units_on_hand: 35, unit_cost: 42.00, unit_price: 84.00, units_sold_30d: 2, units_sold_90d: 16, last_sale_date: daysAgo(11), lead_time_days: 14, supplier_name: "HandTools Direct" },
  { sku_id: "SKU-30015", product_name: "Teflon Tape 12mm", category: "Seals & Gaskets", units_on_hand: 890, unit_cost: 0.90, unit_price: 1.80, units_sold_30d: 30, units_sold_90d: 240, last_sale_date: daysAgo(1), lead_time_days: 5, supplier_name: "SealMaster LLC" },
  { sku_id: "SKU-30016", product_name: "Bearing Puller 3-Jaw 8\"", category: "Tooling", units_on_hand: 18, unit_cost: 58.00, unit_price: 115.00, units_sold_30d: 1, units_sold_90d: 8, last_sale_date: daysAgo(14), lead_time_days: 16, supplier_name: "ToolMaster Inc" },
  { sku_id: "SKU-30017", product_name: "Tank Ball Float 3/4\"", category: "Plumbing", units_on_hand: 128, unit_cost: 6.20, unit_price: 12.50, units_sold_30d: 5, units_sold_90d: 40, last_sale_date: daysAgo(6), lead_time_days: 8, supplier_name: "PlumbingPlus Co" },
  { sku_id: "SKU-30018", product_name: "Spray Nozzle Flat Fan", category: "Pneumatics", units_on_hand: 96, unit_cost: 8.40, unit_price: 16.80, units_sold_30d: 4, units_sold_90d: 32, last_sale_date: daysAgo(8), lead_time_days: 12, supplier_name: "PneumaticParts USA" },
  { sku_id: "SKU-30019", product_name: "Anchor Bolt M12 Chemical", category: "Fasteners", units_on_hand: 340, unit_cost: 1.60, unit_price: 3.20, units_sold_30d: 12, units_sold_90d: 96, last_sale_date: daysAgo(5), lead_time_days: 8, supplier_name: "FastenAll Inc" },
  { sku_id: "SKU-30020", product_name: "Hose Clamp 50-70mm", category: "Plumbing", units_on_hand: 420, unit_cost: 0.80, unit_price: 1.60, units_sold_30d: 14, units_sold_90d: 112, last_sale_date: daysAgo(3), lead_time_days: 5, supplier_name: "PlumbingPlus Co" },

  // ── SCENARIO 4: CLASS A — HIGH VALUE MOVERS (28 SKUs) ────────────────────
  { sku_id: "SKU-40001", product_name: "Motor 3-Phase 5.5kW", category: "Motors", units_on_hand: 12, unit_cost: 620.00, unit_price: 1200.00, units_sold_30d: 8, units_sold_90d: 24, last_sale_date: daysAgo(2), lead_time_days: 21, supplier_name: "MotorParts Direct" },
  { sku_id: "SKU-40002", product_name: "VFD Drive 5.5kW 3Ph", category: "Automation", units_on_hand: 6, unit_cost: 480.00, unit_price: 950.00, units_sold_30d: 5, units_sold_90d: 15, last_sale_date: daysAgo(3), lead_time_days: 28, supplier_name: "AutoControl Systems" },
  { sku_id: "SKU-40003", product_name: "Hydraulic Cylinder 50mm", category: "Hydraulics", units_on_hand: 9, unit_cost: 385.00, unit_price: 750.00, units_sold_30d: 6, units_sold_90d: 18, last_sale_date: daysAgo(2), lead_time_days: 25, supplier_name: "HydroSystems Inc" },
  { sku_id: "SKU-40004", product_name: "Gearbox Helical 10:1", category: "Drive Components", units_on_hand: 8, unit_cost: 890.00, unit_price: 1700.00, units_sold_30d: 4, units_sold_90d: 12, last_sale_date: daysAgo(4), lead_time_days: 35, supplier_name: "GearTech Engineering" },
  { sku_id: "SKU-40005", product_name: "Pump Centrifugal 2\"", category: "Pumps", units_on_hand: 5, unit_cost: 720.00, unit_price: 1380.00, units_sold_30d: 4, units_sold_90d: 12, last_sale_date: daysAgo(3), lead_time_days: 30, supplier_name: "PumpCo USA" },
  { sku_id: "SKU-40006", product_name: "Inverter Welding 200A", category: "Welding", units_on_hand: 7, unit_cost: 340.00, unit_price: 650.00, units_sold_30d: 5, units_sold_90d: 16, last_sale_date: daysAgo(2), lead_time_days: 18, supplier_name: "WeldMaster Supply" },
  { sku_id: "SKU-40007", product_name: "PLC CPU Compact 24I/O", category: "Automation", units_on_hand: 4, unit_cost: 850.00, unit_price: 1650.00, units_sold_30d: 3, units_sold_90d: 9, last_sale_date: daysAgo(5), lead_time_days: 45, supplier_name: "AutoControl Systems" },
  { sku_id: "SKU-40008", product_name: "Servo Motor 400W", category: "Automation", units_on_hand: 5, unit_cost: 520.00, unit_price: 1000.00, units_sold_30d: 4, units_sold_90d: 12, last_sale_date: daysAgo(3), lead_time_days: 35, supplier_name: "AutoControl Systems" },
  { sku_id: "SKU-40009", product_name: "Ball Screw 25mm 500mm", category: "CNC Components", units_on_hand: 6, unit_cost: 280.00, unit_price: 540.00, units_sold_30d: 4, units_sold_90d: 13, last_sale_date: daysAgo(4), lead_time_days: 28, supplier_name: "CNCMaster Parts" },
  { sku_id: "SKU-40010", product_name: "Linear Guide Rail 15mm", category: "CNC Components", units_on_hand: 14, unit_cost: 185.00, unit_price: 360.00, units_sold_30d: 10, units_sold_90d: 30, last_sale_date: daysAgo(2), lead_time_days: 21, supplier_name: "CNCMaster Parts" },
  { sku_id: "SKU-40011", product_name: "Pneumatic Cylinder 50mm", category: "Pneumatics", units_on_hand: 18, unit_cost: 95.00, unit_price: 185.00, units_sold_30d: 14, units_sold_90d: 42, last_sale_date: daysAgo(1), lead_time_days: 16, supplier_name: "PneumaticParts USA" },
  { sku_id: "SKU-40012", product_name: "Flow Meter Magnetic 1\"", category: "Instrumentation", units_on_hand: 4, unit_cost: 680.00, unit_price: 1300.00, units_sold_30d: 2, units_sold_90d: 7, last_sale_date: daysAgo(6), lead_time_days: 40, supplier_name: "MeasureTech Ltd" },
  { sku_id: "SKU-40013", product_name: "Safety Relay 2-Channel", category: "Safety", units_on_hand: 10, unit_cost: 180.00, unit_price: 350.00, units_sold_30d: 8, units_sold_90d: 24, last_sale_date: daysAgo(2), lead_time_days: 14, supplier_name: "SafeGuard Systems" },
  { sku_id: "SKU-40014", product_name: "Encoder Rotary 1024ppr", category: "Sensors", units_on_hand: 8, unit_cost: 145.00, unit_price: 285.00, units_sold_30d: 6, units_sold_90d: 18, last_sale_date: daysAgo(3), lead_time_days: 18, supplier_name: "SensorTech GmbH" },
  { sku_id: "SKU-40015", product_name: "Contactor 40A 3-Pole", category: "Electrical", units_on_hand: 22, unit_cost: 68.00, unit_price: 132.00, units_sold_30d: 18, units_sold_90d: 54, last_sale_date: daysAgo(1), lead_time_days: 12, supplier_name: "ElectroSupply Co" },
  { sku_id: "SKU-40016", product_name: "Circuit Breaker 32A MCB", category: "Electrical", units_on_hand: 35, unit_cost: 42.00, unit_price: 82.00, units_sold_30d: 28, units_sold_90d: 84, last_sale_date: daysAgo(1), lead_time_days: 10, supplier_name: "ElectroSupply Co" },
  { sku_id: "SKU-40017", product_name: "Reducer Worm 40:1", category: "Drive Components", units_on_hand: 6, unit_cost: 320.00, unit_price: 620.00, units_sold_30d: 4, units_sold_90d: 12, last_sale_date: daysAgo(4), lead_time_days: 28, supplier_name: "GearTech Engineering" },
  { sku_id: "SKU-40018", product_name: "Sensor Inductive M18", category: "Sensors", units_on_hand: 48, unit_cost: 28.00, unit_price: 55.00, units_sold_30d: 36, units_sold_90d: 108, last_sale_date: daysAgo(1), lead_time_days: 10, supplier_name: "SensorTech GmbH" },
  { sku_id: "SKU-40019", product_name: "Terminal Block 10mm²", category: "Electrical", units_on_hand: 380, unit_cost: 4.20, unit_price: 8.40, units_sold_30d: 280, units_sold_90d: 840, last_sale_date: daysAgo(1), lead_time_days: 8, supplier_name: "ElectroSupply Co" },
  { sku_id: "SKU-40020", product_name: "Power Supply 24VDC 10A", category: "Electrical", units_on_hand: 14, unit_cost: 95.00, unit_price: 185.00, units_sold_30d: 10, units_sold_90d: 30, last_sale_date: daysAgo(2), lead_time_days: 14, supplier_name: "ElectroSupply Co" },
  { sku_id: "SKU-40021", product_name: "Cylinder Rod 30mm Chr", category: "Hydraulics", units_on_hand: 22, unit_cost: 48.00, unit_price: 95.00, units_sold_30d: 16, units_sold_90d: 48, last_sale_date: daysAgo(2), lead_time_days: 18, supplier_name: "HydroSystems Inc" },
  { sku_id: "SKU-40022", product_name: "Linear Bearing LM25UU", category: "CNC Components", units_on_hand: 60, unit_cost: 12.50, unit_price: 25.00, units_sold_30d: 48, units_sold_90d: 144, last_sale_date: daysAgo(1), lead_time_days: 10, supplier_name: "CNCMaster Parts" },
  { sku_id: "SKU-40023", product_name: "Shaft 40mm EN8 500mm", category: "Raw Materials", units_on_hand: 18, unit_cost: 32.00, unit_price: 64.00, units_sold_30d: 14, units_sold_90d: 42, last_sale_date: daysAgo(2), lead_time_days: 14, supplier_name: "MetalStock Inc" },
  { sku_id: "SKU-40024", product_name: "Plate Steel 10mm 1mx1m", category: "Raw Materials", units_on_hand: 10, unit_cost: 185.00, unit_price: 360.00, units_sold_30d: 8, units_sold_90d: 24, last_sale_date: daysAgo(3), lead_time_days: 14, supplier_name: "MetalStock Inc" },
  { sku_id: "SKU-40025", product_name: "Tube Aluminium 50mm OD", category: "Raw Materials", units_on_hand: 25, unit_cost: 42.00, unit_price: 82.00, units_sold_30d: 18, units_sold_90d: 56, last_sale_date: daysAgo(2), lead_time_days: 12, supplier_name: "MetalStock Inc" },
  { sku_id: "SKU-40026", product_name: "Coupling Rigid 30mm", category: "Drive Components", units_on_hand: 28, unit_cost: 22.00, unit_price: 44.00, units_sold_30d: 20, units_sold_90d: 60, last_sale_date: daysAgo(2), lead_time_days: 12, supplier_name: "CouplingTech" },
  { sku_id: "SKU-40027", product_name: "Gland Nut Cable M25", category: "Electrical", units_on_hand: 220, unit_cost: 2.80, unit_price: 5.60, units_sold_30d: 160, units_sold_90d: 480, last_sale_date: daysAgo(1), lead_time_days: 7, supplier_name: "ElectroSupply Co" },
  { sku_id: "SKU-40028", product_name: "Pump Gear 3/4\" 110V", category: "Pumps", units_on_hand: 8, unit_cost: 185.00, unit_price: 360.00, units_sold_30d: 6, units_sold_90d: 18, last_sale_date: daysAgo(3), lead_time_days: 22, supplier_name: "PumpCo USA" },

  // ── SCENARIO 5: CLASS B — MID-RANGE MOVERS (40 SKUs) ─────────────────────
  ...[
    ["SKU-50001", "Elbow 90° 2\" SS304", "Plumbing", 85, 22.00, 44.00, 28, 84, 10, "PlumbingPlus Co"],
    ["SKU-50002", "Nut Hex M20 8.8", "Fasteners", 420, 0.65, 1.30, 120, 360, 5, "FastenAll Inc"],
    ["SKU-50003", "Tape Insulation 19mm PVC", "Electrical", 580, 1.20, 2.40, 160, 480, 5, "ElectroSupply Co"],
    ["SKU-50004", "Grease NLGI 2 Cartridge", "Lubricants", 145, 5.80, 11.60, 40, 120, 7, "LubeChem Inc"],
    ["SKU-50005", "Hose Hydraulic 1/2\" R2", "Hydraulics", 68, 18.50, 37.00, 20, 60, 14, "HydroSystems Inc"],
    ["SKU-50006", "Switch Limit Metal 10A", "Electrical", 92, 14.00, 28.00, 30, 90, 10, "ElectroSupply Co"],
    ["SKU-50007", "Bolt Set M8x30 DIN933", "Fasteners", 1200, 0.22, 0.45, 350, 1050, 5, "FastenAll Inc"],
    ["SKU-50008", "Wire 2.5mm² Blue 100m", "Electrical", 18, 58.00, 115.00, 6, 18, 10, "ElectroSupply Co"],
    ["SKU-50009", "Spring Tension 40mm", "Springs", 185, 2.80, 5.60, 55, 165, 10, "SpringTech USA"],
    ["SKU-50010", "Reducer Bushing 1\"x3/4\"", "Plumbing", 340, 2.40, 4.80, 95, 285, 7, "PlumbingPlus Co"],
    ["SKU-50011", "Coupling Half 50mm", "Drive Components", 34, 38.00, 75.00, 10, 30, 18, "CouplingTech"],
    ["SKU-50012", "Clamp Hose 20-32mm", "Plumbing", 680, 0.55, 1.10, 190, 570, 5, "PlumbingPlus Co"],
    ["SKU-50013", "Washer Spring M12 SS", "Fasteners", 960, 0.18, 0.36, 280, 840, 5, "FastenAll Inc"],
    ["SKU-50014", "Seal Oil TC 30x52x8", "Seals & Gaskets", 88, 3.80, 7.60, 25, 75, 10, "SealMaster LLC"],
    ["SKU-50015", "Key Woodruff 6x9mm", "Drive Components", 240, 1.20, 2.40, 70, 210, 7, "PowerDrive Corp"],
    ["SKU-50016", "Angle Bracket 90° 50mm", "Structural", 320, 2.60, 5.20, 90, 270, 7, "MetalStock Inc"],
    ["SKU-50017", "Electrode Welding 3.2mm", "Welding", 420, 0.85, 1.70, 130, 390, 7, "WeldMaster Supply"],
    ["SKU-50018", "Solder Tin Lead 60/40", "Electrical", 24, 28.00, 55.00, 8, 24, 12, "ElectroSupply Co"],
    ["SKU-50019", "Epoxy Adhesive 50ml", "Adhesives", 68, 12.00, 24.00, 20, 60, 8, "AdhesiveTech Co"],
    ["SKU-50020", "Paint Brush Set 5pc", "Finishing", 45, 8.50, 17.00, 14, 42, 7, "PaintDepot LLC"],
    ["SKU-50021", "Regulator Pressure 1/2\"", "Pneumatics", 28, 38.00, 76.00, 9, 27, 14, "PneumaticParts USA"],
    ["SKU-50022", "Air Filter 1/2\" 40 Micron", "Pneumatics", 42, 22.00, 44.00, 13, 39, 12, "PneumaticParts USA"],
    ["SKU-50023", "Lubricator Mist 1/2\"", "Pneumatics", 24, 26.00, 52.00, 8, 24, 12, "PneumaticParts USA"],
    ["SKU-50024", "Fitting Elbow 90° 6mm SS", "Pneumatics", 180, 4.20, 8.40, 55, 165, 8, "PneumaticParts USA"],
    ["SKU-50025", "Bushing Plain Bronze 20mm", "Bearings", 96, 6.80, 13.60, 28, 85, 10, "GlobalBearing Inc"],
    ["SKU-50026", "Gasket Spiral 50mm", "Seals & Gaskets", 72, 8.40, 16.80, 22, 66, 12, "SealMaster LLC"],
    ["SKU-50027", "Pin Split 6x50mm SS", "Fasteners", 480, 0.35, 0.70, 140, 420, 5, "FastenAll Inc"],
    ["SKU-50028", "Sheave V-Belt 4\" SPB", "Drive Components", 18, 28.00, 56.00, 6, 18, 16, "PowerDrive Corp"],
    ["SKU-50029", "Idler Sprocket 50B", "Drive Components", 22, 24.00, 48.00, 7, 21, 16, "PowerDrive Corp"],
    ["SKU-50030", "Blade Hacksaw 300mm", "Hand Tools", 185, 1.80, 3.60, 55, 165, 7, "HandTools Direct"],
    ["SKU-50031", "Clamp C 4\" Cast Iron", "Hand Tools", 42, 14.50, 29.00, 13, 39, 10, "HandTools Direct"],
    ["SKU-50032", "Level Spirit 600mm", "Measuring Tools", 18, 22.00, 44.00, 6, 18, 12, "MeasureTech Ltd"],
    ["SKU-50033", "Tape Measure 8m", "Measuring Tools", 35, 8.50, 17.00, 11, 33, 8, "MeasureTech Ltd"],
    ["SKU-50034", "Vernier Caliper 150mm", "Measuring Tools", 12, 28.00, 56.00, 4, 12, 10, "MeasureTech Ltd"],
    ["SKU-50035", "Sandpaper 80 Grit Sheet", "Finishing", 280, 0.65, 1.30, 85, 255, 5, "PaintDepot LLC"],
    ["SKU-50036", "Paintbrush 2\" Flat", "Finishing", 95, 3.20, 6.40, 29, 87, 7, "PaintDepot LLC"],
    ["SKU-50037", "Angle Grinder Disc 115mm", "Tooling", 140, 2.80, 5.60, 42, 126, 7, "ToolMaster Inc"],
    ["SKU-50038", "Cutting Disc 115x1mm", "Tooling", 220, 1.40, 2.80, 66, 198, 5, "ToolMaster Inc"],
    ["SKU-50039", "Flap Disc 115mm 60G", "Tooling", 165, 2.20, 4.40, 50, 150, 5, "ToolMaster Inc"],
    ["SKU-50040", "Drill Bit 10mm HSS", "Tooling", 88, 3.80, 7.60, 26, 78, 8, "ToolMaster Inc"],
  ].map(([skuId, name, cat, qty, cost, price, s30, s90, lt, supp], i) => ({
    sku_id: skuId as string,
    product_name: name as string,
    category: cat as string,
    units_on_hand: qty as number,
    unit_cost: cost as number,
    unit_price: price as number,
    units_sold_30d: s30 as number,
    units_sold_90d: s90 as number,
    last_sale_date: daysAgo((i % 10) + 1),
    lead_time_days: lt as number,
    supplier_name: supp as string,
  })),

  // ── SCENARIO 6: CLASS C — LONG TAIL (87 SKUs) ────────────────────────────
  ...(Array.from({ length: 87 }, (_, i) => {
    const id = i + 1;
    const seed = 60000 + id;
    const cost = seededPrice(seed, 1, 31);
    const price = parseFloat((cost * 2).toFixed(2));
    const s30 = seededInt(seed + 1, 1, 10);
    const s90 = s30 * 3 + seededInt(seed + 2, 0, 4);
    return {
      sku_id: `SKU-60${String(id).padStart(3, "0")}`,
      product_name: `Component Part ${String(id).padStart(3, "0")}`,
      category: ["Fasteners", "Consumables", "Finishing", "Hardware", "Adhesives"][i % 5],
      units_on_hand: seededInt(seed + 3, 20, 219),
      unit_cost: cost,
      unit_price: price,
      units_sold_30d: s30,
      units_sold_90d: s90,
      last_sale_date: daysAgo(seededInt(seed + 4, 1, 15)),
      lead_time_days: seededInt(seed + 5, 5, 16),
      supplier_name: ["FastenAll Inc", "ToolMaster Inc", "PaintDepot LLC", "HandTools Direct", "AdhesiveTech Co"][i % 5],
    };
  })),
];

const DEMO_FIELDS = [
  "item_code",
  "item_name",
  "category",
  "supplier",
  "stock_qty",
  "monthly_usage",
  "unit_cost",
  "lead_time",
  "last_movement_date",
];

function toInventoryItems(rows: InventoryRow[]): InventoryItem[] {
  return rows.map((row) => ({
    item_code: row.sku_id,
    item_name: row.product_name,
    category: row.category,
    supplier: row.supplier_name ?? "",
    stock_qty: row.units_on_hand,
    monthly_usage: row.units_sold_30d,
    unit_cost: row.unit_cost,
    lead_time: row.lead_time_days / 30,
    last_movement_date: row.last_sale_date ? row.last_sale_date.toISOString().slice(0, 10) : undefined,
  }));
}

let _cachedResult: ReturnType<typeof analyzeInventoryItems> | null = null;

export function getDemoData() {
  if (!_cachedResult) {
    _cachedResult = analyzeInventoryItems(toInventoryItems(RAW_ROWS), DEMO_FIELDS, resolvePolicy(), { analysisDate: DEMO_ANALYSIS_DATE });
  }
  return _cachedResult;
}

export function getDemoInventoryItems(): InventoryItem[] {
  return toInventoryItems(RAW_ROWS);
}

export { DEMO_FIELDS };
export { RAW_ROWS };
