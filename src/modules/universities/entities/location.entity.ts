import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('location')
export class LocationEntity {
  @PrimaryColumn({ type: 'text' })
  country: string;

  @PrimaryColumn({ type: 'text' })
  location: string;

  @Column({ type: 'double precision', nullable: true })
  latitude: number;

  @Column({ type: 'double precision', nullable: true })
  longitude: number;
}
