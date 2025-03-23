import * as React from 'react';
import { RadioGroup, Radio, TextField, Tooltip, TooltipTrigger, ContextualHelp, Content, Heading } from "@adobe/react-spectrum";
import { Text } from "@adobe/react-spectrum";
import { Picker } from "@adobe/react-spectrum";
import { ActionButton, Item } from "@adobe/react-spectrum";
import { Flex } from "@adobe/react-spectrum";
import FolderOpen from '@spectrum-icons/workflow/FolderOpen';
import { useTranslation } from 'react-i18next';


function SettingsPanel({configData, documentValue}) {
    const [, forceUpdate] = React.useState({});
    const { t , i18n } = useTranslation();

    return(
        <Flex direction="column" marginY="size-100">
            <Flex direction="column" marginBottom="size-300">
                <Text marginBottom="size-100">{t('Process Image Folder')}</Text>
                <Flex direction="row">
                    <TextField
                        aria-label="Process Image Folder"
                        value={configData.current.processImageFolderPath}
                        isReadOnly
                        marginEnd="size-100"
                        width="size-3000"
                    />
                    <TooltipTrigger delay={0}>
                        <ActionButton
                            aria-label="Select Process Image Folder"
                            onPress={() => {
                                //@ts-ignore
                                const result = window.cep.fs.showOpenDialog(false, true, t("Select Process Image Folder"), configData.current.processImageFolderPath);
                                if (result.err === 0 && result.data.length > 0) {
                                    configData.current.processImageFolderPath = result.data[0];
                                    forceUpdate({});
                                }
                            }}
                            >
                            <FolderOpen />
                        </ActionButton>
                        <Tooltip>{t('select folder')}</Tooltip>
                    </TooltipTrigger>
                </Flex>
            </Flex>
            <Flex direction="column" marginBottom="size-300">
                <Flex direction="row" justifyContent="space-between" marginBottom="size-100">
                    <Text>{t('Resolution')}</Text>
                    <Picker aria-label="Resolution"
                        selectedKey={configData.current.resolution}
                        onSelectionChange={(key: string) => {
                            configData.current.resolution = key;
                            forceUpdate({});
                        }}
                        width="size-1200">
                        <Item key="360">360p</Item>
                        <Item key="720">720p</Item>
                        <Item key="1080">1080p</Item>
                        <Item key="1440">1440p</Item>
                    </Picker>
                </Flex>
                <Flex direction="row" justifyContent="space-between" marginBottom="size-100">
                    <Flex direction="row">
                        <Text marginEnd="size-100">{t('Quality')}</Text>
                        <ContextualHelp variant="help" placement="top start">
                            <Content>
                                <Text>
                                    {t('The higher the Quality you select, the lower the compression rate applied to the image.')}
                                </Text>
                            </Content>
                        </ContextualHelp>
                    </Flex>
                    <Picker aria-label="Quality"
                        selectedKey={configData.current.quality}
                        onSelectionChange={(key: string) => {
                            configData.current.quality = key;
                            forceUpdate({});
                        }}
                        width="size-1200">
                        <Item key="20">{t('low')}</Item>
                        <Item key="70">{t('medium')}</Item>
                        <Item key="90">{t('high')}</Item>
                    </Picker>
                </Flex>
                <Flex direction="row" justifyContent="space-between">
                    <Flex direction="row">
                        <Text marginEnd="size-100">{t('Idle Timeout')}</Text>
                        <ContextualHelp variant="help" placement="top start">
                            <Content>
                                <Text>
                                    {t('When the time elapsed since the last painting exceeds the preset duration, the timer will automatically stop.')}
                                </Text>
                            </Content>
                        </ContextualHelp>
                    </Flex>
                    <Picker aria-label="Idle Timeout"
                        selectedKey={configData.current.idleTimeout}
                        onSelectionChange={(key: string) => {
                            configData.current.idleTimeout = key;
                            forceUpdate({});
                        }}
                        width="size-1200">
                        <Item key="1">{1 + t('min')}</Item>
                        <Item key="5">{5 + t('min')}</Item>
                        <Item key="10">{10 + t('min')}</Item>
                        <Item key="30">{30 + t('min')}</Item>
                        <Item key="0">{t('Off')}</Item>
                    </Picker>
                </Flex>
            </Flex>
            <Flex direction="row" justifyContent="space-between" marginBottom="size-300">
                <Text>{t('Language')}</Text>
                <RadioGroup
                    orientation="horizontal"
                    value={configData.current.language}
                    onChange={(value: string) => {
                        configData.current.language = value;
                        i18n.changeLanguage(value);
                        forceUpdate({});
                    }}
                >
                    <Radio value="cn">中文</Radio>
                    <Radio value="en">English</Radio>
                </RadioGroup>
            </Flex>
        </Flex>
    )
}

export default SettingsPanel;