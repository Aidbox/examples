import { to_BAR } from './src/to_bar.js'
import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'
import swaggerUi from 'swagger-ui-express'
import morgan from 'morgan'
import { swaggerDocument } from './src/swagger.js'
import { BundleEntry } from './types/hl7-fhir-r4-core/Bundle.js'
import { get_invoice_resources } from './src/aidbox.js'
import { MLLPServer } from 'mllp-node-sl7'

function stringify_message(message: Array<Array<string | undefined | Array<string | undefined>>>): string {
    return message.map(segment => {
        return segment.map(field => {
            if (Array.isArray(field)) {
                return field.join('^')
            } else if (typeof field === 'string') {
                return field
            }
        }).join('|')
    }).join('\r')
}

// Create a new express application instance
const app = express()

// Set network envs
const port = process.env.PORT || 3000
const receiver_port = process.env.MLLP_RECEIVER_PORT || 2575
const receiver_host = process.env.MLLP_RECEIVER_HOST

// Define the root path with a greeting message
app.get("/", (req: Request, res: Response) => {
    res.json({ message: 'Welcome to the Express + TypeScript Server!'})
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
app.use(bodyParser.json({type: 'application/fhir+json'}))
app.use(morgan('combined'))

let mllp_server = new MLLPServer('0.0.0.0', 2575)

mllp_server.on('hl7', (data) => {
    console.log('Received HL7 message: \n' + data)
})

app.post('/webhook-test', async (req, res) => {
    let invoice = req.body.entry.filter((x: BundleEntry) => x.resource?.resourceType === 'Invoice')[0].resource
    let resources = await get_invoice_resources(invoice)
    console.log(stringify_message(to_BAR(invoice, resources)))
    mllp_server.send(receiver_host!,
        receiver_port as number,
        stringify_message(to_BAR(invoice, resources)),
        (err, data) => {
            if (err)
                console.log('An error happened: ' + err)
            else
                console.log('Successful MLLP message send: \n' + data)
        })
    res.sendStatus(200)
})

// Start the Express server
app.listen(port, () => {
    console.log(`The server is running at http://localhost:${port}`)
});