import { getLogger } from '@/logging/logger.js';
import { getContractVehiclesByVinSn } from '@/db/odoo/fleet/fleet.js';
import type { OdooFleetVehicleLogContract } from '@/types/odoo/fleets/log.contract/log.contract.js';
import type { WhatsAppContextRepository } from '@/persistence/repositories/whatsapp-context.repository.js';
import { normalizePhone } from '@/persistence/repositories/whatsapp-context.repository.js';
import type { WhatsAppProvider } from '@/whatsapp/whatsapp-provider.js';

const log = getLogger('whatsapp.inbound.contract-review');

const NO_CONTEXT_MESSAGE =
  'No encontramos una solicitud reciente asociada a este numero. Si crees que es un error, contacta a tu asesor.';
const NO_CONTRACT_MESSAGE =
  'No encontramos un contrato asociado a la unidad de tu solicitud. Contacta a tu asesor para mas detalles.';

export class ContractReviewService {
  constructor(
    private readonly whatsAppProvider: WhatsAppProvider,
    private readonly contextRepository: WhatsAppContextRepository,
  ) { }

  async handleRevisar(fromPhone: string): Promise<void> {
    const normalizedPhone = normalizePhone(fromPhone);
    const context = await this.contextRepository.findLatestByPhone(normalizedPhone);
    log.info({ fromPhone, normalizedPhone, context, msg: 'Found WhatsApp context for REVISAR reply' });

    if (!context) {
      log.warn({ fromPhone, msg: 'No WhatsApp context found for REVISAR reply' });
      await this.reply(fromPhone, NO_CONTEXT_MESSAGE);
      return;
    }

    const contracts = await getContractVehiclesByVinSn(context.serial_ending);
    log.info({
      fromPhone,
      serialEnding: context.serial_ending,
      contractCount: contracts.length,
      msg: 'Resolved contracts for REVISAR reply',
    });

    if (contracts.length === 0) {
      await this.reply(fromPhone, NO_CONTRACT_MESSAGE);
      return;
    }

    const message = this.formatContracts(contracts, context.serial_ending);
    log.info({ fromPhone, normalizedPhone, message, msg: 'Formatted contracts for REVISAR reply' });

    await this.reply(fromPhone, message);
    //await this.reply(fromPhone, 'Contratos encontrados: ' + contracts.length);
  }

  private async reply(to: string, body: string): Promise<void> {
    // add delay to avoid soft ban by Twilio random between 5 and 10 seconds
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 5000) + 5000));
    await this.whatsAppProvider.send({ to, body });
  }

  private formatContracts(contracts: OdooFleetVehicleLogContract[], serialEnding: string): string {
    const header = `Detalles del contrato para la unidad ${serialEnding}:`;
    const blocks = contracts.map((contract) => this.formatContract(contract));
    return [header, ...blocks].join('\n\n');
  }

  private formatContract(contract: OdooFleetVehicleLogContract): string {
    const lines = [
      `Contrato: ${this.text(contract.name)}`,
      `Vehiculo: ${this.relationLabel(contract.vehicle_id)}`,
      `Estatus: ${this.text(contract.state)}`,
      `Inicio: ${this.text(contract.start_date)}`,
      `Vencimiento: ${this.text(contract.expiration_date)}`,
      `Dias restantes: ${contract.days_left}`,
    ];
    return lines.join('\n');
  }

  private relationLabel(value: [number, string] | false | null): string {
    return Array.isArray(value) ? value[1] : 'No disponible';
  }

  private text(value: string | false | null): string {
    return value ? value : 'No disponible';
  }
}
