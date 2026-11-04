const { parseArgs } = require('node:util');
const fs = require('node:fs/promises');

function validateGuests(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.guests) || !value.guests.length) {
        throw new Error('Danh sách không hợp lệ. Hãy tải lại file story-guests.json từ dashboard.');
    }
    const used = new Set();
    return value.guests.map((guest, index) => {
        if (!guest || typeof guest.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(guest.slug) || guest.slug.length > 80 ||
            typeof guest.name !== 'string' || !guest.name.trim() || guest.name.trim().length > 100 || /[\u0000-\u001f\u007f]/.test(guest.name)) {
            throw new Error(`Khách số ${index + 1} có tên hoặc mã không hợp lệ.`);
        }
        if (used.has(guest.slug)) throw new Error(`Mã khách bị trùng: ${guest.slug}`);
        used.add(guest.slug);
        return { slug: guest.slug, name: guest.name.trim() };
    });
}

async function readOptions(args) {
    const { values } = parseArgs({ args, options: {
        guests: { type: 'string' }, name: { type: 'string' }, help: { type: 'boolean', short: 'h' },
    } });
    if (values.help) return { help: true, guests: [] };
    if (values.guests !== undefined && values.name !== undefined) throw new Error('Chỉ dùng một trong hai: --guests hoặc --name.');
    if (values.guests !== undefined) {
        const data = JSON.parse(await fs.readFile(values.guests, 'utf8'));
        return { guests: validateGuests(data) };
    }
    if (values.name !== undefined) {
        const slug = values.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/, '') || 'guest';
        return { guests: validateGuests({ version: 1, guests: [{ slug, name: values.name }] }) };
    }
    return { guests: [{ slug: 'hoang-graduation-story', name: 'bạn' }] };
}

module.exports = { validateGuests, readOptions };
