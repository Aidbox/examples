import { to_BAR, stringify_message } from './src/to_bar.js'
import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'
import swaggerUi from 'swagger-ui-express'
import morgan from 'morgan'
import { swaggerDocument } from './src/swagger.js'
import { BundleEntry } from './types/hl7-fhir-r4-core/Bundle.js'
import { get_invoice_resources } from './src/aidbox.js'
import { MLLPServer } from 'mllp-node-sl7'

// Create a new express application instance
const app = express()

// Set network envs
const port = process.env.PORT || 3000
const secret = process.env.SECRET
const receiver_port = process.env.MLLP_RECEIVER_PORT || 2575
const receiver_host = process.env.MLLP_RECEIVER_HOST

// Define the root path with a greeting message
app.get("/ping", (req: Request, res: Response) => {
    res.json({ message: 'Welcome to the HL7v2 conversion server!'})
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
app.use(express.json({type: 'application/fhir+json'}))
app.use(morgan('combined'))
app.use((req, res, next) => {
    if (req.headers.authorization
        && req.headers.authorization === secret)
        return next()
    res.status(403).send('Authentication required.')
})

let mllp_server = new MLLPServer('0.0.0.0', 2575)

mllp_server.on('hl7', (data) => {
    console.log('Received HL7 message: \n' + data)
})

app.post('/webhook', async (req, res) => {
    let invoice = req.body.entry.filter((x: BundleEntry) => x.resource?.resourceType === 'Invoice')[0].resource
    let resources = await get_invoice_resources(invoice)
    let status = 200
    let body: Record<string,any> = {}
    console.log(stringify_message(to_BAR(invoice, resources)))
    mllp_server.send(receiver_host!,
        receiver_port as number,
        stringify_message(to_BAR(invoice, resources)),
        (err, data) => {
            if (err) {
                status = 500
                body = {message: 'An error happened when sending MLLP message: ' + err}
                console.log(body.message)
            } else {
                body = {message: 'Successful MLLP message send: \n' + data}
                console.log(body.message)
            }
        })
    res.statusCode = status
    res.json(body)
})

app.post('/test', async (req, res) => {
    let invoice = req.body.entry.filter((x: BundleEntry) => x.resource?.resourceType === 'Invoice')[0].resource
    let resources = await get_invoice_resources(invoice)
    let status = 200
    let body: string = stringify_message(to_BAR(invoice, resources))
    console.log('Test BAR message: ' + body)
    res.status(status).send(body)
})

// Start the Express server
app.listen(port, () => {
    console.log(`The server is running at http://localhost:${port}`)
});