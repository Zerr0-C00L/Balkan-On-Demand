const { addonBuilder } = require('stremio-addon-sdk');

const manifest = {
    id: 'org.test',
    version: '1.0.0',
    name: 'Test',
    resources: ['catalog'],
    types: ['movie'],
    catalogs: [{
        type: 'movie',
        id: 'test',
        name: 'Test'
    }]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async () => {
    return { metas: [] };
});

const addonInterface = builder.getInterface();

module.exports = (req, res) => {
    addonInterface(req, res);
};
