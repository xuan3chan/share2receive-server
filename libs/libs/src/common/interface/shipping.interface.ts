// tạo interface shpping với 3 đối tượng là GHN, GHTK, agreement
export interface IGHN {
  name: 'GHN';
  intraProvince: {
    mass: 3; // kg
    fee: 15000;
    more: 2500;
  };
  interProvince: {
    mass: 0.5; // kg
    fee: 29000;
    more: 5000;
  };
}
export interface IGHTK {
    name: 'GHTK';
    intraProvince: {
      mass: 3; // kg
      fee: 22000;
      more: 2500;
    };
    interProvince: {
      mass: 0.5; // kg
      fee: 30000;
      more: 2500;
    };
}
export interface IAgreement {
  name: string;
  fee: number;
}
