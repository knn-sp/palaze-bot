export async function createTables(connection) {

    try {
        await connection.execute(`
        CREATE TABLE server_reviews (
            server_id VARCHAR(255) PRIMARY KEY,
            total_ratings INT DEFAULT 0,
            rating_count INT DEFAULT 0,
            rating_sum INT DEFAULT 0,
            average_rating FLOAT DEFAULT 0.0,
            message_id VARCHAR(255),
            channel_id VARCHAR(255)
        );
        `);

        await connection.execute(`
        CREATE TABLE ticket_ids (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ticket_number INT,
            server_id VARCHAR(255),
            channel_id VARCHAR(255),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `);


        console.log('Tabelas de ticket criadas com sucesso.');
    } catch (error) {
        console.error('Erro ao criar tabelas de tickets: ' + error.message);
    }
}