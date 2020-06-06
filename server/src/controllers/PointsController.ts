import { Request, Response } from 'express';
import knex from '../database/connection';

class PointsController {
    async index(request: Request, response: Response) {
        const { city, uf, items } = request.query;

        const parsedItems = String(items)
            .split(',')
            .map(item => Number(item.trim()));

        const points = await knex('points')
            .join('point_items', 'points.id', '=', 'point_items.point_id')
            .whereIn('point_items.item_id', parsedItems)
            .where('city', String(city))
            .where('uf', String(uf))
            .distinct()
            .select('points.*');

        const serializedPoints = points.map(point => {
            return {
                ...points,
                image_url: `http://192.168.0.158:3333/uploads/${point.image}`
            };
        });

        return response.json(serializedPoints);
    };

    async show(request: Request, response: Response) {
        const { id } = request.params;

        const points = await knex('points').where('id', Number(id)).first();

        const items = await knex('points')
            .join('point_items', 'points.id', '=', 'point_items.point_id')
            .join('items', 'items.id', '=', 'point_items.item_id')
            .where('points.id', Number(id))
            .select('items.*');

        points['items'] = items;

        const serializedPoint = {
            ...points,
            image_url: `http://192.168.0.158:3333/uploads/${points.image}`
        };

        return response.json(serializedPoint);
    };

    async create(request: Request, response: Response) {

        const {
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf,
            items
        } = request.body;

        const trx = await knex.transaction();

        const point = {
            image: request.file.filename,
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf
        };

        const insertedIds = await trx('points').insert(point);

        const point_id = insertedIds[0];

        const pointItems = items
            .split(',')
            .map((item: string) => Number(item.trim()))
            .map((item_id: number) => {
                return {
                    item_id,
                    point_id: point_id,
                };
            });

        await trx('point_items').insert(pointItems);

        await trx.commit();

        return response.json({
            id: point_id,
            ...point,
        });

    };
}

export default PointsController;